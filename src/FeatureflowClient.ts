import mittFactory from 'mitt';
import type { Emitter } from 'mitt';
import { RestClient } from './RestClient';
import { createEvaluate } from './evaluate';
import { test } from './conditions';
import events from './events';
import { getDefaultStorage } from './storage';
import type {
  FeatureflowClient as IFeatureflowClient,
  Config,
  ConfigInternal,
  FeatureflowUser,
  Features,
  Feature,
  EvaluatedFeatures,
  Evaluate,
  EventCallback,
  Rule,
  FeatureflowStorage
} from './types';

// Handle both ESM and CommonJS exports for mitt
const mitt =
  typeof mittFactory === 'function'
    ? mittFactory
    : ((mittFactory as { default: typeof mittFactory }).default || mittFactory);

const DEFAULT_BASE_URL = 'https://app.featureflow.io';
const DEFAULT_EVENTS_URL = 'https://events.featureflow.io';

/** Default cache TTL in milliseconds (10 seconds) */
const DEFAULT_CACHE_TTL = 10 * 1000;

const DEFAULT_CONFIG: ConfigInternal = {
  baseUrl: DEFAULT_BASE_URL,
  eventsUrl: DEFAULT_EVENTS_URL,
  defaultFeatures: {},
  initOnCache: false,
  offline: false,
  uniqueEvals: true,
  timeout: 10000,
  cacheTTL: DEFAULT_CACHE_TTL
};

const STORAGE_PREFIX = 'ff:rn:v2'; // Bumped version for new cache format
const ANONYMOUS_ID_KEY = 'ff-anonymous-id';

/**
 * Cache entry with timestamp for freshness checking.
 */
type CacheEntry = {
  features: { [key: string]: Feature };
  timestamp: number;
};

/**
 * Generate a random anonymous ID.
 */
function generateAnonymousId(): string {
  return `anonymous:${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
}

/**
 * Featureflow client for React Native.
 * Handles feature flag evaluation, caching, and event tracking.
 */
export class FeatureflowClientImpl implements IFeatureflowClient {
  private apiKey: string;
  private config: ConfigInternal;
  private features: { [key: string]: Feature } = {};
  private evaluatedFeatures: EvaluatedFeatures = {};
  private user: FeatureflowUser = { id: '' };
  private emitter: Emitter<Record<string, unknown>>;
  private callbackMap: Map<EventCallback, (event: unknown) => void>;
  private restClient: RestClient;
  private storage: FeatureflowStorage;
  private _isInitialized = false;
  private _receivedInitialResponse = false;
  private currentContext: {
    attributes: {
      [key: string]: string | number | Date | string[] | number[] | Date[];
    };
  } = { attributes: {} };

  constructor(
    apiKey: string,
    config: Config = {},
    storage?: FeatureflowStorage
  ) {
    if (!apiKey) {
      throw new Error('Featureflow: API key is required');
    }

    this.apiKey = apiKey;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    };
    this.emitter = mitt<Record<string, unknown>>();
    this.callbackMap = new Map();
    this.restClient = new RestClient(apiKey, this.config);
    this.storage = storage || getDefaultStorage();
  }

  /**
   * Initialize the client with a user.
   */
  async initialize(user?: FeatureflowUser): Promise<Features> {
    const resolvedUser = user || { id: await this.getAnonymousId() };
    return this.fetchFeaturesForUser(resolvedUser);
  }

  /**
   * Update the user context and re-evaluate features.
   */
  async updateUser(user: FeatureflowUser): Promise<Features> {
    return this.fetchFeaturesForUser(user);
  }

  /**
   * Fetch features for a user from the server.
   */
  private async fetchFeaturesForUser(user: FeatureflowUser): Promise<Features> {
    // Resolve user ID
    const userId = user.id || (await this.getAnonymousId());
    this.user = {
      id: userId,
      attributes: user.attributes || {}
    };

    // Set current context for local evaluation
    const now = new Date();
    this.currentContext = {
      attributes: {
        'featureflow.date': [now],
        'featureflow.hourofday': [now.getHours()]
      }
    };

    // Try to load from cache
    const cacheResult = await this.loadFeaturesFromCache(userId);
    if (cacheResult) {
      this.features = cacheResult.features;
      this.emitter.emit(events.LOADED_FROM_CACHE, this.getFeatures());

      // If cache is fresh (< cacheTTL), skip the API call entirely
      if (cacheResult.isFresh) {
        this._isInitialized = true;
        this._receivedInitialResponse = true;
        this.emitter.emit(events.INIT, this.getFeatures());
        this.emitter.emit(events.LOADED, this.getFeatures());
        return this.features;
      }

      // If initOnCache is true, emit INIT but still fetch in background
      if (this.config.initOnCache) {
        this._isInitialized = true;
        this.emitter.emit(events.INIT, this.getFeatures());
        // Continue to fetch fresh data below
      }
    }

    // Fetch from server if not offline
    if (this.config.offline) {
      // Use default features in offline mode
      this.features = {};
      for (const key in this.config.defaultFeatures) {
        this.features[key] = this.config.defaultFeatures[key];
      }
      this._isInitialized = true;
      this._receivedInitialResponse = true;
      this.emitter.emit(events.INIT, this.getFeatures());
      this.emitter.emit(events.LOADED, this.getFeatures());
      return this.features;
    }

    try {
      const features = await this.restClient.getFeatures(this.user);
      this._receivedInitialResponse = true;
      this._isInitialized = true;
      this.features = features || {};

      // Save to cache
      await this.saveFeaturesToCache(userId, this.features);

      this.emitter.emit(events.INIT, this.getFeatures());
      this.emitter.emit(events.LOADED, this.getFeatures());
      return this.features;
    } catch (error) {
      this._receivedInitialResponse = true;
      this._isInitialized = true;
      this.emitter.emit(events.ERROR, error);

      // Return cached or default features on error
      if (Object.keys(this.features).length === 0) {
        for (const key in this.config.defaultFeatures) {
          this.features[key] = this.config.defaultFeatures[key];
        }
      }

      throw error;
    }
  }

  /**
   * Load features from local storage.
   * Returns the features and whether they are fresh (within cacheTTL).
   */
  private async loadFeaturesFromCache(
    userId: string
  ): Promise<{ features: { [key: string]: Feature }; isFresh: boolean } | null> {
    try {
      const cached = await this.storage.getItem(
        `${STORAGE_PREFIX}:${userId}:${this.apiKey}`
      );
      if (cached) {
        const cacheEntry: CacheEntry = JSON.parse(cached);
        
        // Check if cache entry has the new format with timestamp
        if (cacheEntry.features && typeof cacheEntry.timestamp === 'number') {
          const age = Date.now() - cacheEntry.timestamp;
          const isFresh = age < this.config.cacheTTL;
          return { features: cacheEntry.features, isFresh };
        }
        
        // Legacy format (just features object) - treat as stale
        if (typeof cacheEntry === 'object' && !('features' in cacheEntry)) {
          return { features: cacheEntry as unknown as { [key: string]: Feature }, isFresh: false };
        }
      }
    } catch (error) {
      console.warn('[Featureflow] Failed to load features from cache:', error);
    }
    return null;
  }

  /**
   * Save features to local storage with timestamp.
   */
  private async saveFeaturesToCache(
    userId: string,
    features: { [key: string]: Feature }
  ): Promise<void> {
    try {
      const cacheEntry: CacheEntry = {
        features,
        timestamp: Date.now()
      };
      await this.storage.setItem(
        `${STORAGE_PREFIX}:${userId}:${this.apiKey}`,
        JSON.stringify(cacheEntry)
      );
    } catch (error) {
      console.warn('[Featureflow] Failed to save features to cache:', error);
    }
  }

  /**
   * Get all evaluated features.
   */
  getFeatures(): EvaluatedFeatures {
    if (this.config.offline) {
      const features: { [key: string]: Feature } = {};
      for (const key in this.config.defaultFeatures) {
        features[key] = this.config.defaultFeatures[key];
      }
      return this.evalAll(features);
    }
    return this.evalAll(this.features);
  }

  /**
   * Get the current user.
   */
  getUser(): FeatureflowUser {
    return this.user;
  }

  /**
   * Evaluate a single feature.
   */
  evaluate(key: string): Evaluate {
    if (this.config.offline) {
      const defaultFeature = this.config.defaultFeatures[key];
      if (typeof defaultFeature === 'string') {
        return createEvaluate(defaultFeature);
      }
      return createEvaluate('off');
    }

    const feature = this.features[key];
    if (typeof feature === 'undefined') {
      return createEvaluate('off');
    }

    const variant = this.evalRules(feature);
    const evaluate = createEvaluate(variant || 'off');

    // Track evaluation event
    if (
      !this.config.uniqueEvals ||
      (this.config.uniqueEvals && !this.evaluatedFeatures[key])
    ) {
      this.evaluatedFeatures[key] = evaluate.value();
      this.restClient.postEvaluateEvent(this.user, key, evaluate.value());
    }

    return evaluate;
  }

  /**
   * Evaluate all features.
   */
  private evalAll(features: { [key: string]: Feature }): EvaluatedFeatures {
    const evaluated: EvaluatedFeatures = {};
    for (const key of Object.keys(features)) {
      const variant = this.evalRules(features[key]);
      evaluated[key] = variant || 'off';

      // Only post evaluation events if not in offline mode
      if (!this.config.offline && this.config.uniqueEvals && !this.evaluatedFeatures[key]) {
        this.evaluatedFeatures[key] = variant || 'off';
        this.restClient.postEvaluateEvent(this.user, key, variant || 'off');
      }
    }
    return evaluated;
  }

  /**
   * Evaluate rules for a feature.
   */
  private evalRules(feature: Feature): string | undefined {
    if (typeof feature === 'string') {
      return feature;
    }
    if (!feature || !feature.rules || !Array.isArray(feature.rules)) {
      return undefined;
    }
    for (const rule of feature.rules) {
      if (this.ruleMatches(rule)) {
        return rule.variant;
      }
    }
    return undefined;
  }

  /**
   * Check if a rule matches the current context.
   */
  private ruleMatches(rule: Rule): boolean {
    if (!rule.audience) {
      return true;
    }
    if (!rule.audience.conditions) {
      return true;
    }

    for (const condition of rule.audience.conditions) {
      const values = this.currentContext.attributes[condition.target];
      if (!values) {
        continue;
      }

      const valuesArray = Array.isArray(values) ? values : [values];
      let pass = false;

      for (let i = 0; i < valuesArray.length; i++) {
        const value = valuesArray[i];
        if (test(condition.operator, value, condition.values)) {
          pass = true;
          break;
        }
      }

      if (!pass) {
        return false;
      }
    }
    return true;
  }

  /**
   * Track a goal event.
   */
  goal(goalKey: string): void {
    if (this.config.offline) {
      return;
    }
    this.restClient.postGoalEvent(this.user, goalKey, this.getFeatures());
  }

  /**
   * Subscribe to an event.
   */
  on(event: string, callback: EventCallback): void {
    const wrappedCallback: (event: unknown) => void = (e: unknown) =>
      callback(e);
    this.callbackMap.set(callback, wrappedCallback);
    this.emitter.on(event, wrappedCallback);
  }

  /**
   * Unsubscribe from an event.
   */
  off(event: string, callback?: EventCallback): void {
    if (callback) {
      const wrappedCallback = this.callbackMap.get(callback);
      if (wrappedCallback) {
        this.emitter.off(event, wrappedCallback);
        this.callbackMap.delete(callback);
      }
    } else {
      this.emitter.all.delete(event);
    }
  }

  /**
   * Check if initial response has been received.
   */
  hasReceivedInitialResponse(): boolean {
    return this._receivedInitialResponse;
  }

  /**
   * Check if client is initialized.
   */
  isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * Get the anonymous user ID.
   */
  async getAnonymousId(): Promise<string> {
    try {
      const stored = await this.storage.getItem(ANONYMOUS_ID_KEY);
      if (stored) {
        return stored;
      }
    } catch (error) {
      console.warn('[Featureflow] Failed to get anonymous ID:', error);
    }
    return this.resetAnonymousId();
  }

  /**
   * Reset and generate a new anonymous ID.
   */
  async resetAnonymousId(): Promise<string> {
    const anonymousId = generateAnonymousId();
    try {
      await this.storage.setItem(ANONYMOUS_ID_KEY, anonymousId);
    } catch (error) {
      console.warn('[Featureflow] Failed to save anonymous ID:', error);
    }
    return anonymousId;
  }

  /**
   * Close the client and cleanup resources.
   */
  close(): void {
    this.restClient.close();
    this.emitter.all.clear();
    this.callbackMap.clear();
  }
}

/**
 * Create a new Featureflow client.
 */
export function createClient(
  apiKey: string,
  config?: Config,
  storage?: FeatureflowStorage
): IFeatureflowClient {
  return new FeatureflowClientImpl(apiKey, config, storage);
}

/**
 * Initialize and return a ready-to-use Featureflow client.
 * This is the recommended way to create a client instance.
 */
export async function init(
  apiKey: string,
  user?: FeatureflowUser,
  config?: Config
): Promise<IFeatureflowClient> {
  const client = new FeatureflowClientImpl(apiKey, config);
  await client.initialize(user);
  return client;
}

