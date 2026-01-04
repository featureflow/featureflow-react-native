/**
 * Featureflow React Native SDK
 *
 * Official React Native SDK for Featureflow feature flags and A/B testing.
 *
 * @packageDocumentation
 */

// Client
export {
  FeatureflowClientImpl,
  createClient,
  init
} from './FeatureflowClient';

// Providers
export { FeatureflowProvider } from './FeatureflowProvider';
export { FeatureflowProviderWithClient } from './FeatureflowProviderWithClient';

// Context
export { FeatureflowContext } from './context';

// Hooks
export {
  useFeatureflow,
  useFeatures,
  useBooleanFlag,
  useStringFlag,
  useFeatureflowStatus
} from './hooks';

// Events
export { events } from './events';

// Storage
export { ReactNativeStorage, MemoryStorage, getDefaultStorage } from './storage';

// Evaluate helper
export { createEvaluate } from './evaluate';

// Types - Re-exported from featureflow-client
export type {
  // Core types from featureflow-client
  FeatureflowUser,
  Config,
  UserAttributes,
  EvaluatedFeatures,
  Evaluate,
  Features,
  Feature,
} from './types';

// Types defined in React Native SDK
export type {
  // Event and rule types
  EventCallback,
  Rule,
  Audience,
  Condition,
  Conditions,

  // React Native specific types
  FeatureflowClient,
  FeatureflowProviderProps,
  FeatureflowProviderWithClientProps,
  FeatureflowContextValue,
  UseBooleanFlagOptions,
  UseBooleanFlagResult,
  UseStringFlagResult,
  FeatureflowStorage,
} from './types';

export type { FeatureflowStatus } from './hooks';

// Default export for convenience
import { init } from './FeatureflowClient';
export default { init };

