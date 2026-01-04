import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FeatureflowContextProvider } from './context';
import events from './events';
import type {
  FeatureflowProviderWithClientProps,
  FeatureflowContextValue,
  EvaluatedFeatures
} from './types';

/**
 * FeatureflowProviderWithClient component.
 *
 * Provides Featureflow context using a pre-initialized client instance.
 * Use this when you need more control over client initialization.
 *
 * @example
 * ```tsx
 * import { FeatureflowProviderWithClient, init } from '@featureflow/react-native-sdk';
 *
 * // Initialize client first
 * const client = await init('js-env-YOUR_KEY', user);
 *
 * function App() {
 *   return (
 *     <FeatureflowProviderWithClient client={client}>
 *       <YourApp />
 *     </FeatureflowProviderWithClient>
 *   );
 * }
 * ```
 */
export function FeatureflowProviderWithClient({
  client,
  children
}: FeatureflowProviderWithClientProps): React.ReactElement {
  // State
  const [features, setFeatures] = useState<EvaluatedFeatures>(() =>
    client.getFeatures()
  );
  const [isInitialized, setIsInitialized] = useState(() =>
    client.isInitialized()
  );

  // Handle feature updates
  const handleFeaturesUpdate = useCallback(() => {
    const newFeatures = client.getFeatures();
    setFeatures(newFeatures);
    setIsInitialized(client.isInitialized());
  }, [client]);

  // Subscribe to events
  useEffect(() => {
    client.on(events.INIT, handleFeaturesUpdate);
    client.on(events.LOADED, handleFeaturesUpdate);
    client.on(events.LOADED_FROM_CACHE, handleFeaturesUpdate);
    client.on(events.UPDATED, handleFeaturesUpdate);

    // Update state in case client was initialized after mounting
    handleFeaturesUpdate();

    return () => {
      client.off(events.INIT);
      client.off(events.LOADED);
      client.off(events.LOADED_FROM_CACHE);
      client.off(events.UPDATED);
    };
  }, [client, handleFeaturesUpdate]);

  // Context value
  const contextValue = useMemo<FeatureflowContextValue>(
    () => ({
      features,
      client,
      isInitialized,
      isLoading: !isInitialized,
      error: null
    }),
    [features, client, isInitialized]
  );

  return (
    <FeatureflowContextProvider value={contextValue}>
      {children}
    </FeatureflowContextProvider>
  );
}

export default FeatureflowProviderWithClient;

