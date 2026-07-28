import type { PlatformStorage } from './platform';

/**
 * In-memory storage.
 *
 * Lives in `core/` rather than `platform/` because it has no platform dependency — and because
 * the core test suite must be able to run without loading React Native at all. That the tests
 * import nothing from `platform/` is the check that `core/` really is extractable.
 */
export function createMemoryStorage(): PlatformStorage {
  const map = new Map<string, string>();
  return {
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => {
      map.set(key, value);
    },
    removeItem: async (key) => {
      map.delete(key);
    }
  };
}
