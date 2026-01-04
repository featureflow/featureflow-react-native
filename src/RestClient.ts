import * as base64 from 'base64-js';
import type {
  ConfigInternal,
  FeatureflowUser,
  EvaluatedFeatures,
  Features
} from './types';

// SDK version for analytics
const SDK_VERSION = '1.0.0';

type RequestConfig = {
  method: 'GET' | 'POST';
  body?: unknown;
  timeout?: number;
};

/**
 * REST client for communicating with the Featureflow API.
 */
export class RestClient {
  private baseUrl: string;
  private eventsUrl: string;
  private apiKey: string;
  private timeout: number;
  private offline: boolean;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private queues: {
    events: unknown[];
  };

  constructor(apiKey: string, config: ConfigInternal) {
    this.apiKey = apiKey;
    this.baseUrl = config.baseUrl;
    this.eventsUrl = config.eventsUrl;
    this.timeout = config.timeout;
    this.offline = config.offline;
    this.timer = null;
    this.queues = {
      events: []
    };
  }

  /**
   * Fetch feature definitions for a user.
   */
  async getFeatures(user: FeatureflowUser, keys: string[] = []): Promise<Features> {
    const query = keys.length > 0 ? `?keys=${keys.join(',')}` : '';
    return this.request(
      `${this.baseUrl}/api/js/v1/evaluate/${this.apiKey}/user/${encodeURI(this.base64URLEncode(user))}${query}`,
      { method: 'GET', timeout: this.timeout }
    );
  }

  /**
   * Queue a goal event for sending.
   * Does nothing if offline mode is enabled.
   */
  postGoalEvent(
    user: FeatureflowUser,
    goalKey: string,
    evaluatedFeaturesMap: EvaluatedFeatures
  ): void {
    if (this.offline) {
      return;
    }
    this.flushable();
    this.queues.events.push({
      type: 'goal',
      goalKey,
      impressions: 1,
      evaluatedFeatures: evaluatedFeaturesMap,
      timestamp: new Date().toISOString(),
      user
    });
  }

  /**
   * Queue an evaluation event for sending.
   * Does nothing if offline mode is enabled.
   */
  postEvaluateEvent(
    user: FeatureflowUser,
    featureKey: string,
    variant: string
  ): void {
    if (this.offline) {
      return;
    }
    this.flushable();
    this.queues.events.push({
      type: 'evaluate',
      featureKey,
      evaluatedVariant: variant,
      impressions: 1,
      user,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Flush queued events to the server.
   */
  flush(): void {
    const queue: unknown[] = [];
    if (this.queues.events.length > 0) {
      queue.push(...this.queues.events);
      this.queues.events = [];
      // Fire and forget - don't wait for response
      this.request(`${this.eventsUrl}/api/js/v1/event/${this.apiKey}`, {
        method: 'POST',
        body: queue
      }).catch(() => {
        // Silently handle errors for event flushing
      });
    }
    this.timer = null;
  }

  /**
   * Set up a timer to flush events after a delay.
   */
  private flushable(): void {
    if (!this.timer) {
      this.timer = setTimeout(this.flush.bind(this), 2000);
    }
  }

  /**
   * Make an HTTP request using fetch (React Native compatible).
   */
  private async request(endpoint: string, config: RequestConfig): Promise<Features> {
    const controller = new AbortController();
    const timeoutId = config.timeout
      ? setTimeout(() => controller.abort(), config.timeout)
      : null;

    try {
      const headers: Record<string, string> = {
        'X-Featureflow-Client': `ReactNativeClient/${SDK_VERSION}`
      };

      if (config.body) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(endpoint, {
        method: config.method,
        headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: controller.signal
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (response.status === 200) {
        const contentType = response.headers.get('Content-Type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        }
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Encode user object as base64 URL-safe string.
   */
  private base64URLEncode(user: FeatureflowUser): string {
    const jsonString = JSON.stringify(user);
    return base64.fromByteArray(this.stringToBytes(jsonString));
  }

  /**
   * Convert string to Uint8Array.
   */
  private stringToBytes(s: string): Uint8Array {
    const b: number[] = [];
    for (let i = 0; i < s.length; i++) {
      b.push(s.charCodeAt(i));
    }
    return new Uint8Array(b);
  }

  /**
   * Cancel any pending flush timer.
   */
  close(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    // Flush any remaining events (only if not offline)
    if (!this.offline && this.queues.events.length > 0) {
      this.flush();
    }
  }
}

