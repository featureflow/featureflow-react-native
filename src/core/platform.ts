/**
 * The platform interface.
 *
 * Everything in `core/` is written against this and touches no React Native, browser or Node
 * API directly. That is deliberate: this directory is intended to lift out into a shared
 * `@featureflow/js-core` package, with the browser SDK and this SDK becoming thin platform
 * implementations over it. Adding a `react-native` or `window` import to anything under `core/`
 * breaks that, so don't.
 */

/** Response from a request. `status` 0 means the request never reached the server. */
export interface FeatureflowResponse {
  status: number;
  body?: string;
  header(name: string): string | null;
}

export interface PlatformRequests {
  get(url: string, headers: Record<string, string>): Promise<FeatureflowResponse>;
  post(
    url: string,
    headers: Record<string, string>,
    body: string
  ): Promise<FeatureflowResponse>;
  /**
   * Best-effort fire-and-forget send for teardown, where there may be no time for a round trip
   * (`navigator.sendBeacon` on the web). Platforms without an equivalent omit it and the caller
   * falls back to `post`.
   */
  sendBeacon?(url: string, body: string): boolean;
}

/**
 * Key/value persistence.
 *
 * **Async by design.** `localStorage` is synchronous and `AsyncStorage` is not; making this
 * interface synchronous to suit the browser is exactly what would force React Native to fake it.
 * The browser implementation wraps its sync calls in resolved promises, which is the cheap
 * direction of that mismatch.
 */
export interface PlatformStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Foreground/background notifications.
 *
 * The web signals this with `visibilitychange`/`pagehide`; React Native uses `AppState`. Both
 * matter for the same two reasons: refresh flags when the user comes back, and flush queued
 * events before the process can be killed.
 */
export interface PlatformLifecycle {
  /** Returns an unsubscribe function. */
  onForeground(handler: () => void): () => void;
  /** Returns an unsubscribe function. */
  onBackground(handler: () => void): () => void;
}

export interface PlatformInfo {
  /** Identifies the SDK in the `X-Featureflow-Client` header, e.g. `ReactNativeClient`. */
  name: string;
  version: string;
}

export interface Platform {
  requests: PlatformRequests;
  storage: PlatformStorage;
  lifecycle?: PlatformLifecycle;
  info: PlatformInfo;
  /** Unpredictable id for anonymous users. Must not be `Math.random` — see `core/client.ts`. */
  randomId(): string;
  /** Injectable so tests can control time without mocking globals. */
  now(): Date;
}
