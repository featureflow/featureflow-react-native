import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { FeatureflowContext, type FeatureflowContextValue } from './context';
import { FeatureflowClientImpl, type Config } from './FeatureflowClient';
import type { EvaluatedFeatures, FeatureflowUser } from './core/types';

export interface FeatureflowProviderProps {
  apiKey: string;
  user?: FeatureflowUser;
  config?: Config;
  /** Rendered until the first evaluation lands. Prevents a visible variant swap on launch. */
  loadingComponent?: ReactNode;
  children: ReactNode;
}

/**
 * Creates a client, starts it, and republishes flag changes to the tree.
 *
 * One provider, at the app root. A second creates a second client, which double-counts
 * impressions and can disagree with the first about a flag.
 */
export function FeatureflowProvider({
  apiKey,
  user,
  config,
  loadingComponent,
  children
}: FeatureflowProviderProps): React.ReactElement {
  const [client, setClient] = useState<FeatureflowClientImpl | null>(null);
  const [features, setFeatures] = useState<EvaluatedFeatures>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // The config and user are usually inline literals, so depending on them directly would tear
  // the client down and rebuild it on every render.
  const configRef = useRef(config);
  const userRef = useRef(user);
  configRef.current = config;
  userRef.current = user;

  useEffect(() => {
    let cancelled = false;
    const instance = new FeatureflowClientImpl(apiKey, userRef.current, configRef.current);

    const unsubscribe = instance.onFlagsChanged((next) => {
      if (!cancelled) setFeatures(next);
    });

    instance
      .start()
      .then(() => {
        if (cancelled) return;
        setClient(instance);
        setFeatures(instance.getFeatures());
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        // start() is documented never to reject; this is belt and braces so a future change
        // cannot take the host app down with it.
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setClient(instance);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      unsubscribe();
      void instance.close();
    };
  }, [apiKey]);

  // Re-evaluate when the caller passes a different user, without rebuilding the client.
  const userId = user?.id;
  useEffect(() => {
    if (!client || !user) return;
    if (client.getUser().id === user.id) return;
    void client.updateUser(user).then(setFeatures);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, userId]);

  const value = useMemo<FeatureflowContextValue>(
    () => ({
      client,
      features,
      isLoading,
      isReady: client?.isReady ?? false,
      error
    }),
    [client, features, isLoading, error]
  );

  if (isLoading && loadingComponent) {
    return <>{loadingComponent}</>;
  }

  return <FeatureflowContext.Provider value={value}>{children}</FeatureflowContext.Provider>;
}
