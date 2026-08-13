import type { Platform } from './platform';
import type { Controls, CoreConfig, FeatureflowUser, SdkEvent } from './types';

export type FetchOutcome =
  | { ok: true; controls: Controls }
  | { ok: false; reason: 'unauthorized' | 'rateLimited' | 'http' | 'network'; retryAfterMs?: number };

export type SendOutcome =
  | { ok: true }
  | { ok: false; reason: 'unauthorized' | 'rateLimited' | 'http' | 'network'; retryAfterMs?: number };

/**
 * The two client-facing endpoints on sdk-server.
 *
 * Both key on the API key **in the URL path** rather than an auth header — client keys are
 * public by design, and this shape is what makes the evaluate response cacheable at the CDN.
 * `featureflow-edge-proxy` serves the same surface, so paths, headers and response bytes must
 * stay wire-compatible with the browser SDK's.
 */
export class RestClient {
  constructor(
    private readonly apiKey: string,
    private readonly config: CoreConfig,
    private readonly platform: Platform
  ) {}

  /**
   * Standard headers on every request. `X-Featureflow-Application` (when configured — see
   * `core/application.ts`) is write-only telemetry for per-application usage attribution: it
   * never affects the response, so it cannot fragment the CDN cache.
   */
  private get headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Featureflow-Client': `${this.platform.info.name}/${this.platform.info.version}`
    };
    if (this.config.application) {
      headers['X-Featureflow-Application'] = this.config.application;
    }
    return headers;
  }

  async fetchControls(user: FeatureflowUser, keys: string[] = []): Promise<FetchOutcome> {
    const encoded = base64UrlEncode(JSON.stringify(user));
    const query = keys.length > 0 ? `?keys=${encodeURIComponent(keys.join(','))}` : '';
    const url = `${trimSlash(this.config.baseUrl)}/api/js/v1/evaluate/${this.apiKey}/user/${encoded}${query}`;

    let response;
    try {
      response = await this.platform.requests.get(url, this.headers);
    } catch {
      return { ok: false, reason: 'network' };
    }

    const failure = classify(response.status, response.header('Retry-After'));
    if (failure) return failure;

    try {
      return { ok: true, controls: JSON.parse(response.body || '{}') as Controls };
    } catch {
      return { ok: false, reason: 'http' };
    }
  }

  async sendEvents(events: SdkEvent[]): Promise<SendOutcome> {
    const url = `${trimSlash(this.config.eventsUrl)}/api/js/v1/event/${this.apiKey}`;
    const body = JSON.stringify(events);

    let response;
    try {
      response = await this.platform.requests.post(
        url,
        { ...this.headers, 'Content-Type': 'application/json' },
        body
      );
    } catch {
      return { ok: false, reason: 'network' };
    }

    const failure = classify(response.status, response.header('Retry-After'));
    return failure ?? { ok: true };
  }

  /**
   * Fire-and-forget path used at teardown, where there may be no time for a round trip.
   *
   * A beacon cannot set headers, so the application tag rides as an `application` field on
   * the event DTOs instead (the server prefers the header when both are present — see
   * `featureflow-client-sdk-testbed/CONTRACT.md`). The React Native platform omits
   * `sendBeacon`, but this core is written for any platform, and the browser has one.
   */
  sendEventsBeacon(events: SdkEvent[]): boolean {
    const beacon = this.platform.requests.sendBeacon;
    if (!beacon) return false;
    const application = this.config.application;
    const payload = application
      ? events.map((event) => ({ ...event, application }))
      : events;
    const url = `${trimSlash(this.config.eventsUrl)}/api/js/v1/event/${this.apiKey}`;
    return beacon.call(this.platform.requests, url, JSON.stringify(payload));
  }
}

function classify(
  status: number,
  retryAfter: string | null
): { ok: false; reason: 'unauthorized' | 'rateLimited' | 'http' | 'network'; retryAfterMs?: number } | null {
  if (status === 0) return { ok: false, reason: 'network' };
  if (status >= 200 && status < 300) return null;
  if (status === 401 || status === 403) return { ok: false, reason: 'unauthorized' };
  if (status === 429) {
    const seconds = parseInt(retryAfter || '', 10);
    return {
      ok: false,
      reason: 'rateLimited',
      retryAfterMs: seconds > 0 ? seconds * 1000 : undefined
    };
  }
  return { ok: false, reason: 'http' };
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * The user travels as base64 in a **path segment**, so the URL-safe alphabet is used and padding
 * dropped: standard base64 emits `/`, which is a path separator, and `+`, which is ambiguous in
 * a URL. The server decodes with a reader that accepts both alphabets.
 *
 * Hand-rolled rather than using `base64-js` or `Buffer`: neither `btoa` nor `Buffer` is reliably
 * present across React Native runtimes (Hermes, JSC, Expo Go), and this keeps `core/` free of
 * any dependency at all.
 */
export function base64UrlEncode(input: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const bytes = utf8Bytes(input);
  let out = '';
  let i = 0;

  for (; i + 2 < bytes.length; i += 3) {
    const chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += alphabet[(chunk >>> 18) & 63];
    out += alphabet[(chunk >>> 12) & 63];
    out += alphabet[(chunk >>> 6) & 63];
    out += alphabet[chunk & 63];
  }

  const remaining = bytes.length - i;
  if (remaining === 1) {
    const chunk = bytes[i] << 16;
    out += alphabet[(chunk >>> 18) & 63];
    out += alphabet[(chunk >>> 12) & 63];
  } else if (remaining === 2) {
    const chunk = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += alphabet[(chunk >>> 18) & 63];
    out += alphabet[(chunk >>> 12) & 63];
    out += alphabet[(chunk >>> 6) & 63];
  }
  return out;
}

/** UTF-8 encode without depending on `TextEncoder`, which Hermes did not always ship. */
function utf8Bytes(input: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    let code = input.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < input.length) {
      // Surrogate pair.
      const next = input.charCodeAt(i + 1);
      code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
      i++;
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return bytes;
}
