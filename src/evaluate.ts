import type { Evaluate } from './types';

/**
 * Creates an Evaluate instance for a feature flag value.
 * This is a factory function that returns an object with methods
 * to check the feature flag state.
 *
 * @param value - The variant value for the feature
 * @returns An Evaluate object with helper methods
 */
export function createEvaluate(value: string): Evaluate {
  const storedValue = value.toLowerCase();

  return {
    /**
     * Get the raw variant value.
     */
    value(): string {
      return storedValue;
    },

    /**
     * Check if the feature equals a specific variant value (case-insensitive).
     */
    is(val: string): boolean {
      return val.toLowerCase() === storedValue;
    },

    /**
     * Check if the feature is 'on'.
     */
    isOn(): boolean {
      return storedValue === 'on';
    },

    /**
     * Check if the feature is 'off'.
     */
    isOff(): boolean {
      return storedValue === 'off';
    }
  };
}

