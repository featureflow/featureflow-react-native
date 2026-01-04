import { useContext } from 'react';
import { FeatureflowContext } from '../context';
import type { EvaluatedFeatures } from '../types';

/**
 * Hook to access all evaluated features.
 *
 * The returned object is automatically updated when features change.
 *
 * @returns Object mapping feature keys to their variant values
 *
 * @example
 * ```tsx
 * import { useFeatures } from '@featureflow/react-native-sdk';
 *
 * function MyComponent() {
 *   const features = useFeatures();
 *
 *   return (
 *     <View>
 *       {Object.entries(features).map(([key, value]) => (
 *         <Text key={key}>{key}: {value}</Text>
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */
export function useFeatures(): EvaluatedFeatures {
  const { features } = useContext(FeatureflowContext);
  return features;
}

export default useFeatures;

