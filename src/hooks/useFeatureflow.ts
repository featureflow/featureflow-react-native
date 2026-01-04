import { useContext } from 'react';
import { FeatureflowContext } from '../context';
import type { FeatureflowClient } from '../types';

/**
 * Hook to access the Featureflow client instance.
 *
 * @returns The Featureflow client instance
 *
 * @example
 * ```tsx
 * import { useFeatureflow } from '@featureflow/react-native-sdk';
 *
 * function MyComponent() {
 *   const featureflow = useFeatureflow();
 *
 *   // Evaluate a feature
 *   const isNewUI = featureflow.evaluate('new-ui').isOn();
 *
 *   // Track a goal
 *   const handleClick = () => {
 *     featureflow.goal('button-clicked');
 *   };
 *
 *   return isNewUI ? <NewUI onClick={handleClick} /> : <OldUI />;
 * }
 * ```
 */
export function useFeatureflow(): FeatureflowClient {
  const { client } = useContext(FeatureflowContext);
  return client;
}

export default useFeatureflow;

