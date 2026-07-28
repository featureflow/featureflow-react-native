import React, { useEffect, useMemo, useState, type ReactNode } from 'react';

import { FeatureflowContext, type FeatureflowContextValue } from './context';
import type { FeatureflowClientImpl } from './FeatureflowClient';
import type { EvaluatedFeatures } from './core/types';

export interface FeatureflowProviderWithClientProps {
  client: FeatureflowClientImpl;
  children: ReactNode;
}

/**
 * Publishes from a client you built and started yourself.
 *
 * Use this when the client is created outside React — in a DI container, or shared with
 * non-React code. Unlike `FeatureflowProvider`, this does **not** close the client on unmount:
 * it does not own it.
 */
export function FeatureflowProviderWithClient({
  client,
  children
}: FeatureflowProviderWithClientProps): React.ReactElement {
  const [features, setFeatures] = useState<EvaluatedFeatures>(() => client.getFeatures());

  useEffect(() => {
    setFeatures(client.getFeatures());
    return client.onFlagsChanged(setFeatures);
  }, [client]);

  const value = useMemo<FeatureflowContextValue>(
    () => ({
      client,
      features,
      isLoading: !client.isReady,
      isReady: client.isReady,
      error: null
    }),
    [client, features]
  );

  return <FeatureflowContext.Provider value={value}>{children}</FeatureflowContext.Provider>;
}
