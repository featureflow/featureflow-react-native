import { FeatureflowCore, type FlagsListener } from './core/client';
import type { Platform, PlatformStorage } from './core/platform';
import type {
  CoreConfig,
  Evaluate,
  EvaluatedFeatures,
  FeatureflowUser,
  GoalDetails
} from './core/types';
import { createReactNativePlatform } from './platform';

export const SDK_VERSION = '2.0.0';

/**
 * Public configuration. A subset of `CoreConfig` with React Native naming, plus the storage
 * override tests need.
 */
export interface Config extends Partial<Omit<CoreConfig, 'logger'>> {
  /** Replace AsyncStorage — for tests, or a preview environment without it. */
  storage?: PlatformStorage;
  /** Emit SDK diagnostics. Omitted by default: an SDK should not fill your logs uninvited. */
  logger?: CoreConfig['logger'];
}

/**
 * The Featureflow React Native client.
 *
 * A thin composition of the platform-independent `FeatureflowCore` with the React Native
 * platform implementation. All the evaluation, event and caching logic lives in `core/`.
 */
export class FeatureflowClientImpl {
  private readonly core: FeatureflowCore;

  constructor(apiKey: string, user?: FeatureflowUser, config: Config = {}) {
    const { storage, ...coreConfig } = config;
    const platform: Platform = createReactNativePlatform({
      timeoutMs: config.requestTimeoutMs,
      storage,
      version: SDK_VERSION
    });
    this.core = new FeatureflowCore(apiKey, user, coreConfig, platform);
  }

  /** Resolves once the first evaluation has been applied. Never rejects. */
  start(): Promise<void> {
    return this.core.start();
  }

  /** Evaluates a feature and records an impression. */
  evaluate(featureKey: string): Evaluate {
    return this.core.evaluate(featureKey);
  }

  /** Evaluates without recording an impression — for debug screens and diagnostics. */
  peek(featureKey: string): Evaluate {
    return this.core.peek(featureKey);
  }

  /** Every feature and its evaluated variant. Records no impressions. */
  getFeatures(): EvaluatedFeatures {
    return this.core.getFeatures();
  }

  /** Records a goal for the current user. */
  track(goalKey: string, details?: GoalDetails): void {
    this.core.track(goalKey, details);
  }

  /**
   * @deprecated Use {@link track}, which also accepts a metric value and custom data.
   */
  goal(goalKey: string): void {
    this.core.track(goalKey);
  }

  /** Switches user and re-evaluates every feature. */
  updateUser(user: FeatureflowUser): Promise<EvaluatedFeatures> {
    return this.core.updateUser(user);
  }

  getUser(): FeatureflowUser {
    return this.core.getUser();
  }

  /**
   * The persisted anonymous id. Send it to your own backend — as
   * `X-Featureflow-Anonymous-Id` — to keep a signed-out user in the same experiment arm on both
   * sides.
   */
  getAnonymousId(): Promise<string> {
    return this.core.getAnonymousId();
  }

  /** Issues a new anonymous id. Follow with {@link updateUser} to re-evaluate. */
  resetAnonymousId(): Promise<string> {
    return this.core.resetAnonymousId();
  }

  /** Re-fetches now. Returns false on failure, keeping the previous values. */
  refresh(): Promise<boolean> {
    return this.core.refresh();
  }

  get isReady(): boolean {
    return this.core.isReady;
  }

  /** Subscribes to evaluation changes. Returns an unsubscribe function. */
  onFlagsChanged(listener: FlagsListener): () => void {
    return this.core.onFlagsChanged(listener);
  }

  /** Stops polling and event delivery, flushing anything queued. */
  close(): Promise<void> {
    return this.core.close();
  }
}

export type FeatureflowClient = FeatureflowClientImpl;

/** Creates a client without starting it. Call `start()` yourself. */
export function createClient(
  apiKey: string,
  user?: FeatureflowUser,
  config: Config = {}
): FeatureflowClientImpl {
  return new FeatureflowClientImpl(apiKey, user, config);
}

/**
 * Creates a client and waits for the first evaluation.
 *
 * Awaiting this before rendering flag-driven UI avoids a visible variant swap. It never rejects
 * — a flag service being unreachable must not stop an app from starting.
 */
export async function init(
  apiKey: string,
  user?: FeatureflowUser,
  config: Config = {}
): Promise<FeatureflowClientImpl> {
  const client = new FeatureflowClientImpl(apiKey, user, config);
  await client.start();
  return client;
}
