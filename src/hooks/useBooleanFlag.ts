import { useContext, useMemo } from 'react';
import { FeatureflowContext } from '../context';
import type { UseBooleanFlagOptions, UseBooleanFlagResult } from '../types';

/**
 * Hook to evaluate a boolean feature flag.
 *
 * This is a convenience hook for features that are either 'on' or 'off'.
 *
 * @param featureKey - The feature key to evaluate
 * @param options - Optional configuration
 * @returns Object with isOn, isOff, and isLoading properties
 *
 * @example
 * ```tsx
 * import { useBooleanFlag } from '@featureflow/react-native-sdk';
 *
 * function MyComponent() {
 *   const { isOn, isLoading } = useBooleanFlag('new-feature');
 *
 *   if (isLoading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   return isOn ? <NewFeature /> : <OldFeature />;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With default value
 * const { isOn } = useBooleanFlag('beta-feature', { defaultValue: true });
 * ```
 */
export function useBooleanFlag(
  featureKey: string,
  options: UseBooleanFlagOptions = {}
): UseBooleanFlagResult {
  const { client, isLoading } = useContext(FeatureflowContext);
  const { defaultValue = false } = options;

  return useMemo(() => {
    if (isLoading) {
      return {
        isOn: defaultValue,
        isOff: !defaultValue,
        isLoading: true
      };
    }

    const evaluate = client.evaluate(featureKey);
    return {
      isOn: evaluate.isOn(),
      isOff: evaluate.isOff(),
      isLoading: false
    };
  }, [client, featureKey, isLoading, defaultValue]);
}

export default useBooleanFlag;

