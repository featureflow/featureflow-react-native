import type { ReactNode } from 'react';

// Re-export types that are available from featureflow-client
export type {
  FeatureflowUser,
  Config as BaseConfig,
  EvaluatedFeatures,
  Evaluate,
  Features,
  Feature,
  UserAttributes,
} from 'featureflow-client';

// Import types we need to reference
import type {
  FeatureflowUser,
  Config as BaseConfig,
  EvaluatedFeatures,
  Evaluate,
  Features,
} from 'featureflow-client';

/**
 * React Native specific configuration options.
 * Extends the base Config from featureflow-client with additional options.
 */
export type Config = BaseConfig & {
  /**
   * Cache time-to-live in milliseconds.
   * If cached features are fresher than this, skip the API call on initialization.
   * Set to 0 to always fetch fresh features.
   * @default 10000 (10 seconds)
   */
  cacheTTL?: number;

  /**
   * Timeout in milliseconds for API requests.
   * @default 10000 (10 seconds)
   */
  timeout?: number;
};

// ============================================
// Types not exported from featureflow-client
// ============================================

/**
 * Callback function type for event handlers.
 */
export type EventCallback<T = unknown> = (...args: T[]) => void;

/**
 * Targeting rule for feature evaluation.
 */
export type Rule = {
  audience?: Audience;
  variant: string;
};

/**
 * A single condition within an audience.
 */
export type Condition = {
  target: string;
  operator: string;
  values: (string | number)[];
};

/**
 * Array of conditions that define targeting criteria.
 */
export type Conditions = Condition[];

/**
 * Audience definition with targeting conditions.
 */
export type Audience = {
  conditions: Conditions;
};

// ============================================
// React Native Specific Types
// ============================================

/**
 * Internal configuration with resolved defaults.
 * @internal
 */
export type ConfigInternal = {
  baseUrl: string;
  eventsUrl: string;
  defaultFeatures: { [key: string]: string };
  initOnCache: boolean;
  offline: boolean;
  uniqueEvals: boolean;
  timeout: number;
  /**
   * Cache time-to-live in milliseconds.
   * If cached features are fresher than this, skip the API call.
   * @default 10000 (10 seconds)
   */
  cacheTTL: number;
};

/**
 * Props for FeatureflowProvider component.
 */
export type FeatureflowProviderProps = {
  /** Your Featureflow environment SDK key */
  apiKey: string;
  /** Optional user context for targeting */
  user?: FeatureflowUser;
  /** Optional SDK configuration */
  config?: Config;
  /** Child components to render */
  children: ReactNode;
  /**
   * Component to render while loading features.
   * If not provided, children will render immediately with default/cached features.
   */
  loadingComponent?: ReactNode;
};

/**
 * Props for FeatureflowProviderWithClient component.
 */
export type FeatureflowProviderWithClientProps = {
  /** Pre-initialized Featureflow client instance */
  client: FeatureflowClient;
  /** Child components to render */
  children: ReactNode;
};

/**
 * Context value provided to consumers.
 */
export type FeatureflowContextValue = {
  /** All evaluated features */
  features: EvaluatedFeatures;
  /** The Featureflow client instance */
  client: FeatureflowClient;
  /** Whether the client is initialized */
  isInitialized: boolean;
  /** Whether the client is currently loading */
  isLoading: boolean;
  /** Any error that occurred during initialization */
  error: Error | null;
};

/**
 * Storage interface for feature caching.
 * React Native uses AsyncStorage which is async, unlike browser localStorage.
 */
export interface FeatureflowStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Options for the useBooleanFlag hook.
 */
export type UseBooleanFlagOptions = {
  /**
   * Default value to return before features are loaded.
   * @default false
   */
  defaultValue?: boolean;
};

/**
 * Result from the useBooleanFlag hook.
 */
export type UseBooleanFlagResult = {
  /** Whether the flag is on */
  isOn: boolean;
  /** Whether the flag is off */
  isOff: boolean;
  /** Whether features are still loading */
  isLoading: boolean;
};

/**
 * Result from the useStringFlag hook.
 */
export type UseStringFlagResult = {
  /** The variant value */
  value: string;
  /** Whether features are still loading */
  isLoading: boolean;
};

/**
 * Featureflow client interface for React Native.
 * 
 * Note: This differs from the browser SDK in that storage operations are async
 * (AsyncStorage instead of localStorage), so methods like getAnonymousId() return Promises.
 */
export interface FeatureflowClient {
  /**
   * Initialize the client with a user.
   * Returns a Promise that resolves when initialization is complete.
   */
  initialize(user?: FeatureflowUser): Promise<Features>;

  /**
   * Update the user context and re-evaluate all features.
   * Returns a Promise that resolves when update is complete.
   */
  updateUser(user: FeatureflowUser): Promise<Features>;

  /**
   * Get all evaluated features as a map of feature keys to variant values.
   */
  getFeatures(): EvaluatedFeatures;

  /**
   * Get the current user context.
   */
  getUser(): FeatureflowUser;

  /**
   * Evaluate a feature by key.
   * Returns an Evaluate object with helper methods.
   */
  evaluate(key: string): Evaluate;

  /**
   * Send a goal event for A/B testing experiments.
   */
  goal(goalKey: string): void;

  /**
   * Subscribe to an event.
   */
  on(event: string, callback: EventCallback): void;

  /**
   * Unsubscribe from an event.
   * If no callback is provided, removes all listeners for the event.
   */
  off(event: string, callback?: EventCallback): void;

  /**
   * Check if the client has received an initial response from the server.
   */
  hasReceivedInitialResponse(): boolean;

  /**
   * Check if the client has been initialized.
   */
  isInitialized(): boolean;

  /**
   * Get the anonymous user ID.
   * Note: Returns a Promise because React Native uses AsyncStorage.
   */
  getAnonymousId(): Promise<string>;

  /**
   * Reset and generate a new anonymous user ID.
   * Note: Returns a Promise because React Native uses AsyncStorage.
   */
  resetAnonymousId(): Promise<string>;

  /**
   * Close the client and cleanup resources.
   */
  close(): void;
}
