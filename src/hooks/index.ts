import { useCallback, useContext } from 'react';

import { FeatureflowContext } from '../context';
import type { FeatureflowClientImpl } from '../FeatureflowClient';
import { createEvaluate } from '../core/evaluate';
import type { Evaluate, EvaluatedFeatures, GoalDetails } from '../core/types';

const OFF = createEvaluate('off');

/**
 * The client, for imperative use — `updateUser`, `refresh`, `getAnonymousId`.
 *
 * Returns null before the provider has started. Prefer the flag hooks below in render.
 */
export function useFeatureflow(): FeatureflowClientImpl | null {
  return useContext(FeatureflowContext).client;
}

/**
 * Every feature and its variant, re-rendering when a rollout changes.
 *
 * Records **no** impressions — an impression must mean the user was exposed to the feature, and
 * a bulk read is not exposure. Use `useFeature` where the user actually sees it.
 */
export function useFeatures(): EvaluatedFeatures {
  return useContext(FeatureflowContext).features;
}

/**
 * Evaluates one feature, recording an impression, and re-renders when it changes.
 *
 * This is the hook to reach for. It subscribes to updates, where
 * `useFeatureflow()?.evaluate(...)` reads a value once and will not re-render when the flag
 * changes underneath it.
 */
export function useFeature(featureKey: string): Evaluate {
  const { client, features } = useContext(FeatureflowContext);
  // `features` is read so the hook re-runs when the evaluation changes; the value comes from
  // the client so the impression is recorded and the JSON payload is available.
  void features;
  if (!client) return OFF;
  return client.evaluate(featureKey);
}

export interface UseBooleanFlagOptions {
  /** Served while the first evaluation is still in flight. */
  defaultValue?: boolean;
}

export interface UseBooleanFlagResult {
  isOn: boolean;
  isOff: boolean;
  isLoading: boolean;
}

/** Convenience for on/off flags. */
export function useBooleanFlag(
  featureKey: string,
  options: UseBooleanFlagOptions = {}
): UseBooleanFlagResult {
  const { isLoading } = useContext(FeatureflowContext);
  const evaluation = useFeature(featureKey);

  if (isLoading && options.defaultValue !== undefined) {
    return { isOn: options.defaultValue, isOff: !options.defaultValue, isLoading };
  }
  return { isOn: evaluation.isOn(), isOff: evaluation.isOff(), isLoading };
}

export interface UseStringFlagResult {
  value: string;
  isLoading: boolean;
}

/** Convenience for multi-variant flags. */
export function useStringFlag(featureKey: string, defaultValue = 'off'): UseStringFlagResult {
  const { isLoading } = useContext(FeatureflowContext);
  const evaluation = useFeature(featureKey);
  return { value: isLoading ? defaultValue : evaluation.value(), isLoading };
}

/**
 * The evaluated variant's JSON config payload, or undefined when it has none.
 *
 * Always supply a fallback — a variant can be added in the dashboard without a payload.
 */
export function useJsonValue<T = unknown>(featureKey: string): T | undefined {
  return useFeature(featureKey).jsonValue<T>();
}

/** A stable function for recording goals for the current user. */
export function useTrack(): (goalKey: string, details?: GoalDetails) => void {
  const client = useFeatureflow();
  return useCallback(
    (goalKey: string, details?: GoalDetails) => client?.track(goalKey, details),
    [client]
  );
}

export interface FeatureflowStatus {
  isLoading: boolean;
  isReady: boolean;
  error: Error | null;
}

/** Initialisation status, for a splash screen or an error state. */
export function useFeatureflowStatus(): FeatureflowStatus {
  const { isLoading, isReady, error } = useContext(FeatureflowContext);
  return { isLoading, isReady, error };
}
