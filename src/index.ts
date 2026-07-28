/**
 * Featureflow React Native SDK
 *
 * Official React Native SDK for Featureflow feature flags and A/B testing.
 *
 * The evaluation, event and caching logic lives in `core/`, written against a `Platform`
 * interface and free of any React Native import. `platform/` is the React Native
 * implementation of that interface. The split is deliberate — see CLAUDE.md.
 *
 * @packageDocumentation
 */

// Client
export {
  FeatureflowClientImpl,
  createClient,
  init,
  SDK_VERSION,
  type Config,
  type FeatureflowClient
} from './FeatureflowClient';

// Providers
export { FeatureflowProvider, type FeatureflowProviderProps } from './FeatureflowProvider';
export {
  FeatureflowProviderWithClient,
  type FeatureflowProviderWithClientProps
} from './FeatureflowProviderWithClient';

// Context
export { FeatureflowContext, type FeatureflowContextValue } from './context';

// Hooks
export {
  useFeatureflow,
  useFeatures,
  useFeature,
  useBooleanFlag,
  useStringFlag,
  useJsonValue,
  useTrack,
  useFeatureflowStatus,
  type UseBooleanFlagOptions,
  type UseBooleanFlagResult,
  type UseStringFlagResult,
  type FeatureflowStatus
} from './hooks';

// Events
export { events, type FeatureflowEvent } from './events';

// Platform — exported so tests and previews can substitute storage
export {
  createReactNativePlatform,
  reactNativeStorage,
  randomId
} from './platform';

// Core — exported for advanced use and for the shared-core extraction
export { FeatureflowCore, type FlagsListener } from './core/client';
export { createMemoryStorage } from './core/memoryStorage';
export { createEvaluate } from './core/evaluate';
export type {
  Platform,
  PlatformRequests,
  PlatformStorage,
  PlatformLifecycle,
  PlatformInfo,
  FeatureflowResponse
} from './core/platform';
export type {
  FeatureflowUser,
  UserAttributes,
  AttributeValue,
  EvaluatedFeatures,
  Evaluate,
  GoalDetails,
  Controls,
  EvaluatedControl,
  EvalRule,
  EvalAudience,
  EvalCondition,
  CoreConfig,
  Logger,
  SdkEvent
} from './core/types';

import { init } from './FeatureflowClient';
export default { init };
