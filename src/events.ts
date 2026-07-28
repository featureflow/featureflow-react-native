/**
 * Event names, kept for API compatibility with the browser SDK.
 *
 * Prefer `client.onFlagsChanged(...)` or the `useFeatures` hook — both are driven by the same
 * notification and do not require you to manage subscriptions by hand.
 */
export const events = {
  INIT: 'INIT',
  LOADED_FROM_CACHE: 'LOADED_FROM_CACHE',
  UPDATED_FEATURE: 'UPDATED_FEATURE',
  ERROR: 'ERROR'
} as const;

export type FeatureflowEvent = (typeof events)[keyof typeof events];
