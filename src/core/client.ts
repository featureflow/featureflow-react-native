import { sanitiseApplication } from './application';
import { createEvaluate } from './evaluate';
import { EventsSummary } from './eventsSummary';
import type { Platform } from './platform';
import { RestClient } from './restClient';
import { evaluateControl } from './ruleEvaluator';
import {
  DEFAULT_CORE_CONFIG,
  type Controls,
  type CoreConfig,
  type Evaluate,
  type EvaluatedFeatures,
  type FeatureflowUser,
  type GoalDetails
} from './types';

const ANONYMOUS_ID_KEY = 'ff-anonymous-id';
const CACHE_PREFIX = 'ff-features';

export type FlagsListener = (features: EvaluatedFeatures) => void;

interface CacheEntry {
  controls: Controls;
  timestamp: number;
}

/**
 * The platform-independent Featureflow client.
 *
 * Everything here is written against the `Platform` interface, so the same class backs the
 * React Native SDK and — once extracted to `@featureflow/js-core` — the browser SDK.
 */
export class FeatureflowCore {
  private readonly config: CoreConfig;
  private readonly rest: RestClient;
  private readonly events: EventsSummary;
  private readonly listeners = new Set<FlagsListener>();

  private controls: Controls = {};
  private user: FeatureflowUser;
  private ready = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private unsubscribers: Array<() => void> = [];

  constructor(
    private readonly apiKey: string,
    user: FeatureflowUser | undefined,
    config: Partial<CoreConfig>,
    private readonly platform: Platform
  ) {
    this.config = { ...DEFAULT_CORE_CONFIG, ...config };
    // A config mistake should be visible even without a logger configured — an invalid tag
    // is a developer error, not runtime diagnostics.
    this.config.application = sanitiseApplication(this.config.application, (message) =>
      this.config.logger ? this.config.logger.warn(message) : console.warn(`Featureflow: ${message}`)
    );
    this.rest = new RestClient(apiKey, this.config, platform);
    this.events = new EventsSummary(this.rest, this.config, () => platform.now());
    this.user = user ?? { id: '' };
  }

  // ---- Lifecycle ------------------------------------------------------------

  /**
   * Resolves once the first evaluation has been applied, from the network or the cache.
   *
   * **Never rejects.** A flag service being unreachable must not stop an app from starting; the
   * client falls back to the cache, then to `defaultFeatures`, then to `off`.
   */
  async start(): Promise<void> {
    if (!this.user.id) {
      this.user = { ...this.user, id: await this.anonymousId() };
    }

    const fresh = await this.loadFromCache();
    if (!fresh) {
      await this.refreshSwallowingErrors();
    } else {
      // A fresh cache still triggers a background refresh — the user gets an immediate answer
      // and a current one shortly after.
      this.ready = true;
      void this.refreshSwallowingErrors();
    }

    this.ready = true;
    this.events.start();
    this.startPolling(this.config.pollingIntervalMs);
    this.observeLifecycle();
  }

  /**
   * Stops polling and event delivery, flushing anything queued. The client is not usable
   * afterwards.
   */
  async close(): Promise<void> {
    this.stopPolling();
    this.events.stop();
    this.unsubscribers.forEach((off) => off());
    this.unsubscribers = [];
    this.listeners.clear();
    await this.events.flush(true);
  }

  get isReady(): boolean {
    return this.ready;
  }

  getUser(): FeatureflowUser {
    return this.user;
  }

  // ---- Evaluation -----------------------------------------------------------

  /** Evaluates a feature and records an impression. */
  evaluate(featureKey: string): Evaluate {
    const resolved = this.resolve(featureKey);
    this.events.recordEvaluation(featureKey, resolved.value(), this.user);
    return resolved;
  }

  /**
   * Evaluates without recording an impression.
   *
   * For debug screens and diagnostics — anywhere a read does not mean the user was exposed to
   * the feature. Impressions drive experiment denominators and stale-flag detection, so
   * non-exposures must stay out of them.
   */
  peek(featureKey: string): Evaluate {
    return this.resolve(featureKey);
  }

  /** Every feature and its evaluated variant. Records no impressions. */
  getFeatures(): EvaluatedFeatures {
    const now = this.platform.now();
    const features: EvaluatedFeatures = {};
    for (const key of Object.keys(this.controls)) {
      const resolved = evaluateControl(this.controls[key], now);
      features[key] = (resolved?.variant ?? this.fallback(key)).toLowerCase();
    }
    for (const key of Object.keys(this.config.defaultFeatures)) {
      if (features[key] === undefined) {
        features[key] = this.config.defaultFeatures[key].toLowerCase();
      }
    }
    return features;
  }

  private resolve(featureKey: string): Evaluate {
    if (this.config.offline) return createEvaluate(this.fallback(featureKey));
    // Resolved against the clock *now*, not when the response was fetched — a mobile session
    // can run for days, and a frozen hour would keep a 9-to-5 rule on at midnight.
    const resolved = evaluateControl(this.controls[featureKey], this.platform.now());
    if (!resolved) return createEvaluate(this.fallback(featureKey));
    return createEvaluate(resolved.variant, resolved.value);
  }

  private fallback(featureKey: string): string {
    return this.config.defaultFeatures[featureKey] ?? 'off';
  }

  // ---- Goals ----------------------------------------------------------------

  track(goalKey: string, details?: GoalDetails): void {
    this.events.recordGoal(goalKey, this.user, details);
  }

  // ---- User -----------------------------------------------------------------

  /**
   * Switches user and re-evaluates. Queued impressions are flushed first so they stay
   * attributed to the user who generated them.
   */
  async updateUser(user: FeatureflowUser): Promise<EvaluatedFeatures> {
    await this.events.flush();

    this.user = user.id ? user : { ...user, id: await this.anonymousId() };
    this.ready = false;
    await this.loadFromCache();
    await this.refreshSwallowingErrors();
    this.ready = true;
    return this.getFeatures();
  }

  async getAnonymousId(): Promise<string> {
    return this.anonymousId();
  }

  /**
   * Issues a new anonymous id. Does not re-evaluate on its own — follow with `updateUser`.
   */
  async resetAnonymousId(): Promise<string> {
    const id = this.platform.randomId();
    await this.platform.storage.setItem(ANONYMOUS_ID_KEY, id);
    return id;
  }

  private async anonymousId(): Promise<string> {
    try {
      const stored = await this.platform.storage.getItem(ANONYMOUS_ID_KEY);
      if (stored) return stored;
    } catch {
      // Storage unavailable — fall through and generate a per-session id rather than failing.
    }
    const id = this.platform.randomId();
    try {
      await this.platform.storage.setItem(ANONYMOUS_ID_KEY, id);
    } catch {
      // Unpersisted means the user re-buckets next launch, which is bad but not fatal.
    }
    return id;
  }

  // ---- Refresh --------------------------------------------------------------

  /** Re-fetches now. Returns false on failure, leaving the previous values in place. */
  async refresh(): Promise<boolean> {
    if (this.config.offline) {
      this.ready = true;
      return true;
    }

    const previous = this.getFeatures();
    const outcome = await this.rest.fetchControls(this.user);
    if (!outcome.ok) {
      this.config.logger?.warn(`Flag refresh failed: ${outcome.reason}`);
      return false;
    }

    this.controls = outcome.controls;
    this.ready = true;
    if (this.config.useCache) await this.saveToCache();

    const next = this.getFeatures();
    if (!shallowEqual(previous, next)) this.notify(next);
    return true;
  }

  private async refreshSwallowingErrors(): Promise<boolean> {
    try {
      return await this.refresh();
    } catch {
      this.ready = true;
      return false;
    }
  }

  // ---- Cache ----------------------------------------------------------------

  /**
   * The cache key includes the user id **and** the API key. Serving a previous user's flags to
   * a new one is a correctness bug, not untidiness — they may have had different entitlements.
   */
  private cacheKey(): string {
    return `${CACHE_PREFIX}:${this.user.id}:${this.apiKey}`;
  }

  /** Returns true if the cache was present and still within its TTL. */
  private async loadFromCache(): Promise<boolean> {
    if (!this.config.useCache || this.config.offline) return false;
    try {
      const raw = await this.platform.storage.getItem(this.cacheKey());
      if (!raw) return false;
      const entry = JSON.parse(raw) as CacheEntry;
      if (!entry || typeof entry.timestamp !== 'number' || !entry.controls) return false;

      this.controls = entry.controls;
      this.notify(this.getFeatures());
      return this.platform.now().getTime() - entry.timestamp < this.config.cacheTTLMs;
    } catch {
      // A cache written by an older SDK version is discarded rather than fatal.
      return false;
    }
  }

  private async saveToCache(): Promise<void> {
    try {
      const entry: CacheEntry = {
        controls: this.controls,
        timestamp: this.platform.now().getTime()
      };
      await this.platform.storage.setItem(this.cacheKey(), JSON.stringify(entry));
    } catch {
      // Caching is an optimisation; failing to write must not break evaluation.
    }
  }

  // ---- Listeners ------------------------------------------------------------

  /** Returns an unsubscribe function. */
  onFlagsChanged(listener: FlagsListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(features: EvaluatedFeatures): void {
    this.listeners.forEach((listener) => {
      try {
        listener(features);
      } catch (error) {
        // One listener throwing must not stop the others, or break the poll loop.
        this.config.logger?.warn(`Flag listener threw: ${String(error)}`);
      }
    });
  }

  // ---- Polling and lifecycle ------------------------------------------------

  private startPolling(intervalMs: number): void {
    this.stopPolling();
    if (this.config.offline || intervalMs <= 0) return;
    this.pollTimer = setInterval(() => {
      void this.refreshSwallowingErrors();
    }, intervalMs);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Without this, a flag change never reaches an app that is already open — the previous
   * version of this SDK fetched only at init, which is fine for a browser page but not for a
   * mobile session that lasts days.
   */
  private observeLifecycle(): void {
    const lifecycle = this.platform.lifecycle;
    if (!lifecycle) return;

    this.unsubscribers.push(
      lifecycle.onForeground(() => {
        this.startPolling(this.config.pollingIntervalMs);
        if (this.config.refreshOnForeground) void this.refreshSwallowingErrors();
      })
    );

    this.unsubscribers.push(
      lifecycle.onBackground(() => {
        // The last reliable moment to send: a backgrounded app can be killed without notice.
        void this.events.flush(true);
        this.startPolling(this.config.backgroundPollingIntervalMs);
      })
    );
  }
}

function shallowEqual(a: EvaluatedFeatures, b: EvaluatedFeatures): boolean {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}
