import { useContext, useMemo } from 'react';
import { FeatureflowContext } from '../context';
import type { UseStringFlagResult } from '../types';

/**
 * Hook to evaluate a string/variant feature flag.
 *
 * Use this for features with multiple variants (A/B/C testing, etc.)
 *
 * @param featureKey - The feature key to evaluate
 * @param defaultValue - Default value while loading (defaults to 'off')
 * @returns Object with value and isLoading properties
 *
 * @example
 * ```tsx
 * import { useStringFlag } from '@featureflow/react-native-sdk';
 *
 * function MyComponent() {
 *   const { value, isLoading } = useStringFlag('pricing-tier');
 *
 *   if (isLoading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   switch (value) {
 *     case 'premium':
 *       return <PremiumPricing />;
 *     case 'basic':
 *       return <BasicPricing />;
 *     default:
 *       return <FreePricing />;
 *   }
 * }
 * ```
 */
export function useStringFlag(
  featureKey: string,
  defaultValue = 'off'
): UseStringFlagResult {
  const { client, isLoading } = useContext(FeatureflowContext);

  return useMemo(() => {
    if (isLoading) {
      return {
        value: defaultValue,
        isLoading: true
      };
    }

    const evaluate = client.evaluate(featureKey);
    return {
      value: evaluate.value(),
      isLoading: false
    };
  }, [client, featureKey, isLoading, defaultValue]);
}

export default useStringFlag;

