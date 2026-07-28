import { createContext } from 'react';

import type { FeatureflowClientImpl } from './FeatureflowClient';
import type { EvaluatedFeatures } from './core/types';

export interface FeatureflowContextValue {
  client: FeatureflowClientImpl | null;
  features: EvaluatedFeatures;
  isLoading: boolean;
  isReady: boolean;
  error: Error | null;
}

export const FeatureflowContext = createContext<FeatureflowContextValue>({
  client: null,
  features: {},
  isLoading: true,
  isReady: false,
  error: null
});
