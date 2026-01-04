import { useContext } from 'react';
import { FeatureflowContext } from '../context';

/**
 * Status information about the Featureflow client.
 */
export interface FeatureflowStatus {
  /** Whether the client has completed initialization */
  isInitialized: boolean;
  /** Whether the client is currently loading features */
  isLoading: boolean;
  /** Any error that occurred during initialization */
  error: Error | null;
  /** Whether features are ready to be used */
  isReady: boolean;
}

/**
 * Hook to access the Featureflow client status.
 *
 * Useful for showing loading states or handling errors.
 *
 * @returns Status object with isInitialized, isLoading, error, and isReady
 *
 * @example
 * ```tsx
 * import { useFeatureflowStatus } from '@featureflow/react-native-sdk';
 *
 * function MyComponent() {
 *   const { isLoading, error, isReady } = useFeatureflowStatus();
 *
 *   if (isLoading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   if (error) {
 *     return <ErrorMessage error={error} />;
 *   }
 *
 *   if (!isReady) {
 *     return null;
 *   }
 *
 *   return <MyFeatureEnabledContent />;
 * }
 * ```
 */
export function useFeatureflowStatus(): FeatureflowStatus {
  const { isInitialized, isLoading, error } = useContext(FeatureflowContext);

  return {
    isInitialized,
    isLoading,
    error,
    isReady: isInitialized && !isLoading && !error
  };
}

export default useFeatureflowStatus;

