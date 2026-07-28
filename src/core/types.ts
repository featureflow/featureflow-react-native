/**
 * Wire and public types for the client contract.
 *
 * The contract is specified once in `featureflow-client-sdk-testbed/CONTRACT.md`; the server
 * side is `sdk-server/src/services/evaluate.service.ts` and `src/routes/js/`.
 */

export type AttributeValue = string | number | boolean | Array<string | number>;
export type UserAttributes = Record<string, AttributeValue>;

export interface FeatureflowUser {
  id: string;
  attributes?: UserAttributes;
  sessionAttributes?: UserAttributes;
}

// ---- Evaluate response ------------------------------------------------------

export interface EvalCondition {
  target: string;
  operator: string;
  values: unknown[];
}

export interface EvalAudience {
  conditions: EvalCondition[];
}

export interface EvalRule {
  /** Pre-computed server-side from the user's bucket. */
  variant: string;
  /** The variant's JSON config payload, if it has one. */
  value?: unknown;
  /**
   * Present only on partially evaluated rules. Holds `featureflow.date` /
   * `featureflow.hourofday` conditions the server deliberately left for this device.
   */
  audience?: EvalAudience;
}

export interface EvaluatedControl {
  rules: EvalRule[];
}

/** The whole `/evaluate` response: feature key to its candidate rules. */
export type Controls = Record<string, EvaluatedControl>;

/** Feature key to evaluated variant. */
export type EvaluatedFeatures = Record<string, string>;

// ---- Evaluation result ------------------------------------------------------

export interface Evaluate {
  value(): string;
  is(variant: string): boolean;
  isOn(): boolean;
  isOff(): boolean;
  jsonValue<T = unknown>(): T | undefined;
}

// ---- Goals ------------------------------------------------------------------

/**
 * A number is the metric value; an object's optional `value` is the metric value and its
 * remaining fields are sent as custom data. Matches the OpenFeature tracking shape and the
 * Node/browser/Java SDKs.
 */
export type GoalDetails = number | ({ value?: number } & Record<string, unknown>);

// ---- Events -----------------------------------------------------------------

export interface SdkEvent {
  type: 'evaluate' | 'goal';
  featureKey: string;
  timestamp: string;
  user?: FeatureflowUser;
  impressions?: number;
  evaluatedVariant?: string;
  goalKey?: string;
  value?: number;
  data?: Record<string, unknown>;
}

// ---- Config -----------------------------------------------------------------

export interface CoreConfig {
  baseUrl: string;
  eventsUrl: string;
  /**
   * Foreground poll interval in ms. **This is the propagation latency for a flag change**, and
   * the main driver of billable request volume. 0 disables polling.
   */
  pollingIntervalMs: number;
  /**
   * Background poll interval in ms. 0 disables it, which is the honest default on mobile: a
   * backgrounded app is suspended (iOS) or subject to Doze (Android), so timers do not fire.
   */
  backgroundPollingIntervalMs: number;
  /** Re-fetch when the app returns to the foreground, regardless of the poll timer. */
  refreshOnForeground: boolean;
  requestTimeoutMs: number;
  /** No network at all; serves `defaultFeatures`. For tests and previews. */
  offline: boolean;
  /** Served before the first fetch, and when offline or uncached. Anything unlisted is `off`. */
  defaultFeatures: EvaluatedFeatures;
  useCache: boolean;
  /** How long a cached evaluation is served as fresh before a refresh is forced, in ms. */
  cacheTTLMs: number;
  disableEvents: boolean;
  eventFlushIntervalMs: number;
  maxEventQueueSize: number;
  logger?: Logger;
}

export interface Logger {
  debug(message: string): void;
  warn(message: string): void;
}

export const DEFAULT_CORE_CONFIG: CoreConfig = {
  baseUrl: 'https://app.featureflow.io',
  eventsUrl: 'https://events.featureflow.io',
  pollingIntervalMs: 60_000,
  backgroundPollingIntervalMs: 0,
  refreshOnForeground: true,
  requestTimeoutMs: 10_000,
  offline: false,
  defaultFeatures: {},
  useCache: true,
  cacheTTLMs: 10_000,
  disableEvents: false,
  eventFlushIntervalMs: 30_000,
  maxEventQueueSize: 1000
};
