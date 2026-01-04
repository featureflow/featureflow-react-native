import { createContext } from 'react';
import type { FeatureflowContextValue } from './types';

/**
 * Default context value.
 * Used when components are rendered outside of a FeatureflowProvider.
 */
const defaultContextValue: FeatureflowContextValue = {
  features: {},
  client: {
    initialize: async () => ({}),
    updateUser: async () => ({}),
    getFeatures: () => ({}),
    getUser: () => ({ id: '' }),
    evaluate: () => ({
      is: () => false,
      isOn: () => false,
      isOff: () => true,
      value: () => 'off'
    }),
    goal: () => undefined,
    on: () => undefined,
    off: () => undefined,
    hasReceivedInitialResponse: () => false,
    isInitialized: () => false,
    getAnonymousId: async () => '',
    resetAnonymousId: async () => '',
    close: () => undefined
  },
  isInitialized: false,
  isLoading: true,
  error: null
};

/**
 * React context for Featureflow.
 */
export const FeatureflowContext =
  createContext<FeatureflowContextValue>(defaultContextValue);

/**
 * Provider component from context.
 */
export const FeatureflowContextProvider = FeatureflowContext.Provider;

export default FeatureflowContext;

