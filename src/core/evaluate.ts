import type { Evaluate } from './types';

/**
 * Builds the evaluation result every Featureflow SDK exposes: `isOn`, `isOff`, `is`, `value`,
 * `jsonValue`.
 *
 * Variant comparison is case-insensitive, matching the browser SDK.
 */
export function createEvaluate(variant: string, jsonPayload?: unknown): Evaluate {
  const stored = String(variant).toLowerCase();

  return {
    value: () => stored,
    is: (other: string) => String(other).toLowerCase() === stored,
    isOn: () => stored === 'on',
    isOff: () => stored === 'off',
    jsonValue: <T = unknown>() => jsonPayload as T | undefined
  };
}
