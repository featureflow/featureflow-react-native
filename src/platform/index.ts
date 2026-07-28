import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus } from 'react-native';

import { createMemoryStorage } from '../core/memoryStorage';
import type {
  Platform,
  PlatformLifecycle,
  PlatformRequests,
  PlatformStorage,
  FeatureflowResponse
} from '../core/platform';

/**
 * The React Native implementation of the `Platform` interface.
 *
 * This is the only directory that imports React Native. Everything in `core/` is written
 * against the interface, which is what makes it extractable into a shared package.
 */

// ---- Requests ---------------------------------------------------------------

/**
 * `fetch` rather than `XMLHttpRequest`: it is present in every React Native runtime and gives a
 * promise API. `AbortController` gives us the timeout, which `fetch` alone does not.
 */
export function createRequests(timeoutMs: number): PlatformRequests {
  async function request(
    url: string,
    init: RequestInit
  ): Promise<FeatureflowResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      const body = await response.text();
      return {
        status: response.status,
        body,
        header: (name) => response.headers.get(name)
      };
    } catch {
      // Includes the abort. Status 0 is the core's signal for "never reached the server".
      return { status: 0, header: () => null };
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    get: (url, headers) => request(url, { method: 'GET', headers }),
    post: (url, headers, body) => request(url, { method: 'POST', headers, body })
    // No sendBeacon: React Native has no equivalent, so the core falls back to `post`.
  };
}

// ---- Storage ----------------------------------------------------------------

export const reactNativeStorage: PlatformStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key)
};

// ---- Lifecycle --------------------------------------------------------------

/**
 * `AppState` is what makes flags refresh when the user comes back to the app, and what gives
 * the events queue a last chance to flush before the process can be killed.
 */
export function createLifecycle(): PlatformLifecycle {
  function subscribe(
    predicate: (status: AppStateStatus, previous: AppStateStatus) => boolean,
    handler: () => void
  ): () => void {
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', (next) => {
      if (predicate(next, previous)) handler();
      previous = next;
    });
    return () => subscription.remove();
  }

  return {
    onForeground: (handler) =>
      subscribe(
        (next, previous) => next === 'active' && previous !== 'active',
        handler
      ),
    onBackground: (handler) =>
      subscribe(
        (next, previous) =>
          (next === 'background' || next === 'inactive') && previous === 'active',
        handler
      )
  };
}

// ---- Random -----------------------------------------------------------------

/**
 * Anonymous ids must be unpredictable and collision-resistant: the id is the bucketing key, so
 * two users sharing one land in the same variant of every experiment.
 *
 * `Math.random` — which the previous version of this SDK used — is neither. `crypto.getRandomValues`
 * is present in modern React Native and Expo; where it is not, the fallback still mixes in time
 * and multiple `Math.random` draws so a collision needs both a clock collision and 128 bits.
 */
export function randomId(): string {
  const bytes = new Uint8Array(16);
  const cryptoObj = (globalThis as { crypto?: Crypto }).crypto;

  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    const stamp = Date.now();
    bytes[0] ^= stamp & 0xff;
    bytes[1] ^= (stamp >>> 8) & 0xff;
    bytes[2] ^= (stamp >>> 16) & 0xff;
    bytes[3] ^= (stamp >>> 24) & 0xff;
  }

  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return `anonymous:${hex}`;
}

// ---- Assembly ---------------------------------------------------------------

export interface PlatformOptions {
  timeoutMs?: number;
  storage?: PlatformStorage;
  version: string;
}

export { createMemoryStorage };

export function createReactNativePlatform(options: PlatformOptions): Platform {
  return {
    requests: createRequests(options.timeoutMs ?? 10_000),
    storage: options.storage ?? reactNativeStorage,
    lifecycle: createLifecycle(),
    info: { name: 'ReactNativeClient', version: options.version },
    randomId,
    now: () => new Date()
  };
}
