import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FeatureflowContextProvider } from './context';
import { FeatureflowClientImpl } from './FeatureflowClient';
import events from './events';
import type {
  FeatureflowProviderProps,
  FeatureflowContextValue,
  EvaluatedFeatures,
  FeatureflowClient
} from './types';

/**
 * FeatureflowProvider component.
 *
 * Provides Featureflow context to child components.
 * Initializes the client on mount and automatically updates features.
 *
 * @example
 * ```tsx
 * import { FeatureflowProvider } from '@featureflow/react-native-sdk';
 *
 * function App() {
 *   return (
 *     <FeatureflowProvider
 *       apiKey="js-env-YOUR_KEY"
 *       user={{ id: 'user-123', attributes: { tier: 'gold' } }}
 *     >
 *       <YourApp />
 *     </FeatureflowProvider>
 *   );
 * }
 * ```
 */
export function FeatureflowProvider({
  apiKey,
  user,
  config,
  children,
  loadingComponent
}: FeatureflowProviderProps): React.ReactElement {
  // Create client instance (only once)
  const [client] = useState<FeatureflowClient>(() => {
    return new FeatureflowClientImpl(apiKey, config);
  });

  // State
  const [features, setFeatures] = useState<EvaluatedFeatures>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Handle feature updates
  const handleFeaturesUpdate = useCallback(() => {
    const newFeatures = client.getFeatures();
    setFeatures(newFeatures);
  }, [client]);

  // Initialize client on mount
  useEffect(() => {
    let isMounted = true;

    const initClient = async () => {
      try {
        await client.initialize(user);

        if (!isMounted) return;

        setFeatures(client.getFeatures());
        setIsInitialized(true);
        setIsLoading(false);
        setError(null);
      } catch (err) {
        if (!isMounted) return;

        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
        setIsInitialized(true);
        // Still set features from cache/defaults
        setFeatures(client.getFeatures());
      }
    };

    // Subscribe to events
    client.on(events.INIT, handleFeaturesUpdate);
    client.on(events.LOADED, handleFeaturesUpdate);
    client.on(events.LOADED_FROM_CACHE, handleFeaturesUpdate);

    initClient();

    return () => {
      isMounted = false;
      client.off(events.INIT);
      client.off(events.LOADED);
      client.off(events.LOADED_FROM_CACHE);
    };
  }, [client, user, handleFeaturesUpdate]);

  // Update user when it changes
  useEffect(() => {
    if (isInitialized && user) {
      client.updateUser(user).then(() => {
        setFeatures(client.getFeatures());
      }).catch((err) => {
        console.warn('[Featureflow] Failed to update user:', err);
      });
    }
  }, [client, user, isInitialized]);

  // Context value
  const contextValue = useMemo<FeatureflowContextValue>(
    () => ({
      features,
      client,
      isInitialized,
      isLoading,
      error
    }),
    [features, client, isInitialized, isLoading, error]
  );

  // Show loading component if provided and still loading
  if (isLoading && loadingComponent) {
    return <>{loadingComponent}</>;
  }

  return (
    <FeatureflowContextProvider value={contextValue}>
      {children}
    </FeatureflowContextProvider>
  );
}

export default FeatureflowProvider;

