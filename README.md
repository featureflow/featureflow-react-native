# @featureflow/react-native-sdk

[![npm version](https://badge.fury.io/js/%40featureflow%2Freact-native-sdk.svg)](https://www.npmjs.com/package/@featureflow/react-native-sdk)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

> Official React Native SDK for [Featureflow](https://www.featureflow.io) feature flags and A/B testing.

## Features

- 🚀 **Easy Integration** - Simple Provider/Hook pattern for React Native
- 📱 **React Native Optimized** - Uses AsyncStorage for persistent caching
- 🔄 **Real-time Updates** - Automatic feature updates when user context changes
- 📦 **TypeScript First** - Full TypeScript support with comprehensive types
- 🎯 **A/B Testing** - Built-in goal tracking for experiments
- 💾 **Offline Support** - Works offline with cached features

## Installation

```bash
# npm
npm install @featureflow/react-native-sdk @react-native-async-storage/async-storage

# yarn
yarn add @featureflow/react-native-sdk @react-native-async-storage/async-storage

# For iOS, install CocoaPods dependencies
cd ios && pod install
```

### Peer Dependencies

This SDK requires the following peer dependencies:
- `react` >= 16.8.0
- `react-native` >= 0.60.0
- `@react-native-async-storage/async-storage` >= 1.17.0

## Quick Start

### 1. Wrap Your App with the Provider

```tsx
// App.tsx
import React from 'react';
import { FeatureflowProvider } from '@featureflow/react-native-sdk';
import MainApp from './MainApp';

const FF_KEY = 'js-env-YOUR_KEY_HERE';

function App() {
  const user = {
    id: 'user-123',
    attributes: {
      tier: 'gold',
      country: 'australia'
    }
  };

  return (
    <FeatureflowProvider
      apiKey={FF_KEY}
      user={user}
    >
      <MainApp />
    </FeatureflowProvider>
  );
}

export default App;
```

### 2. Use Feature Flags in Components

```tsx
// MainApp.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useFeatureflow, useBooleanFlag } from '@featureflow/react-native-sdk';

function MainApp() {
  // Option 1: Use the boolean flag hook (recommended for on/off flags)
  const { isOn, isLoading } = useBooleanFlag('new-feature');

  // Option 2: Use the client directly for more control
  const featureflow = useFeatureflow();
  const variant = featureflow.evaluate('experiment-color').value();

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  return (
    <View style={{ backgroundColor: variant === 'blue' ? 'blue' : 'red' }}>
      {isOn ? <NewFeature /> : <OldFeature />}
    </View>
  );
}
```

## Provider Options

### FeatureflowProvider (Standard)

The standard provider initializes the client on mount.

```tsx
import { FeatureflowProvider } from '@featureflow/react-native-sdk';

<FeatureflowProvider
  apiKey="js-env-YOUR_KEY"
  user={{ id: 'user-123', attributes: { plan: 'premium' } }}
  config={{ offline: false }}
  loadingComponent={<LoadingScreen />}  // Optional
>
  <App />
</FeatureflowProvider>
```

### FeatureflowProviderWithClient (Bring Your Own Client)

Use a pre-initialized client for more control over initialization timing.

```tsx
import { FeatureflowProviderWithClient, init } from '@featureflow/react-native-sdk';

// Initialize before rendering
const client = await init('js-env-YOUR_KEY', user);

<FeatureflowProviderWithClient client={client}>
  <App />
</FeatureflowProviderWithClient>
```

## Hooks

### `useFeatureflow()`

Returns the Featureflow client instance for evaluating features and tracking goals.

```tsx
import { useFeatureflow } from '@featureflow/react-native-sdk';

function MyComponent() {
  const featureflow = useFeatureflow();

  // Evaluate a feature
  const isOn = featureflow.evaluate('my-feature').isOn();
  const variant = featureflow.evaluate('my-feature').value();

  // Check specific variant
  const isPremium = featureflow.evaluate('pricing-tier').is('premium');

  // Track a goal (for A/B testing)
  const handlePurchase = () => {
    featureflow.goal('purchase-completed');
  };

  return (
    <Button onPress={handlePurchase}>
      {isPremium ? 'Premium Checkout' : 'Standard Checkout'}
    </Button>
  );
}
```

### `useFeatures()`

Returns all evaluated features as an object. Automatically updates when features change.

```tsx
import { useFeatures } from '@featureflow/react-native-sdk';

function DebugPanel() {
  const features = useFeatures();

  return (
    <View>
      {Object.entries(features).map(([key, value]) => (
        <Text key={key}>{key}: {value}</Text>
      ))}
    </View>
  );
}
```

### `useBooleanFlag(key, options?)`

Convenience hook for boolean (on/off) feature flags.

```tsx
import { useBooleanFlag } from '@featureflow/react-native-sdk';

function MyComponent() {
  const { isOn, isOff, isLoading } = useBooleanFlag('dark-mode');

  // With default value (shown while loading)
  const { isOn: betaEnabled } = useBooleanFlag('beta-feature', {
    defaultValue: true
  });

  return isOn ? <DarkTheme /> : <LightTheme />;
}
```

### `useStringFlag(key, defaultValue?)`

Hook for multi-variant feature flags.

```tsx
import { useStringFlag } from '@featureflow/react-native-sdk';

function PricingPage() {
  const { value, isLoading } = useStringFlag('pricing-tier', 'standard');

  switch (value) {
    case 'premium':
      return <PremiumPricing />;
    case 'basic':
      return <BasicPricing />;
    default:
      return <StandardPricing />;
  }
}
```

### `useFeatureflowStatus()`

Hook to check the client initialization status.

```tsx
import { useFeatureflowStatus } from '@featureflow/react-native-sdk';

function AppLoader() {
  const { isLoading, error, isReady } = useFeatureflowStatus();

  if (isLoading) {
    return <SplashScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  return <MainApp />;
}
```

## Updating User Context

Update the user context at runtime to re-evaluate features (e.g., after login):

```tsx
const featureflow = useFeatureflow();

// After user logs in
await featureflow.updateUser({
  id: 'new-user-id',
  attributes: {
    tier: 'premium',
    beta: true
  }
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | `'https://app.featureflow.io'` | Featureflow API base URL |
| `eventsUrl` | `string` | `'https://events.featureflow.io'` | Events API URL |
| `defaultFeatures` | `object` | `{}` | Default feature values for offline/loading states |
| `initOnCache` | `boolean` | `false` | Emit INIT event when loading from cache |
| `offline` | `boolean` | `false` | Run in offline mode (no network requests) |
| `uniqueEvals` | `boolean` | `true` | Only send unique evaluation events |
| `timeout` | `number` | `10000` | Request timeout in milliseconds |

```tsx
<FeatureflowProvider
  apiKey="js-env-YOUR_KEY"
  config={{
    defaultFeatures: {
      'new-feature': 'off',
      'experiment': 'control'
    },
    timeout: 5000,
    uniqueEvals: true
  }}
>
  <App />
</FeatureflowProvider>
```

## TypeScript Support

The SDK is written in TypeScript and includes comprehensive type definitions:

```tsx
import type {
  FeatureflowUser,
  FeatureflowConfig,
  FeatureflowClient,
  EvaluatedFeatures,
  Evaluate
} from '@featureflow/react-native-sdk';

const user: FeatureflowUser = {
  id: 'user-123',
  attributes: {
    tier: 'gold',
    countries: ['AU', 'NZ']
  }
};

const config: FeatureflowConfig = {
  defaultFeatures: {
    'my-feature': 'off'
  }
};
```

## Advanced Usage

### Manual Client Initialization

For more control over when the client initializes:

```tsx
import { init, FeatureflowProviderWithClient } from '@featureflow/react-native-sdk';

// Initialize in your app startup logic
async function initializeApp() {
  const client = await init('js-env-YOUR_KEY', {
    id: 'user-123',
    attributes: { tier: 'gold' }
  });

  // Now render your app
  return client;
}

// In your App component
function App() {
  const [client, setClient] = useState(null);

  useEffect(() => {
    initializeApp().then(setClient);
  }, []);

  if (!client) {
    return <SplashScreen />;
  }

  return (
    <FeatureflowProviderWithClient client={client}>
      <MainApp />
    </FeatureflowProviderWithClient>
  );
}
```

### Custom Storage

You can provide a custom storage implementation:

```tsx
import { createClient, FeatureflowStorage } from '@featureflow/react-native-sdk';

class MyCustomStorage implements FeatureflowStorage {
  async getItem(key: string): Promise<string | null> {
    // Your implementation
  }
  async setItem(key: string, value: string): Promise<void> {
    // Your implementation
  }
  async removeItem(key: string): Promise<void> {
    // Your implementation
  }
}

const client = createClient('js-env-YOUR_KEY', config, new MyCustomStorage());
```

### Event Handling

Listen to Featureflow events:

```tsx
import { useFeatureflow, events } from '@featureflow/react-native-sdk';

function MyComponent() {
  const featureflow = useFeatureflow();

  useEffect(() => {
    const handleInit = (features) => {
      console.log('Features loaded:', features);
    };

    featureflow.on(events.INIT, handleInit);

    return () => {
      featureflow.off(events.INIT, handleInit);
    };
  }, [featureflow]);
}
```

Available events:
- `events.INIT` - Features initialized
- `events.LOADED` - Features loaded from server
- `events.LOADED_FROM_CACHE` - Features loaded from local cache
- `events.ERROR` - Error occurred
- `events.UPDATED` - Features updated after user change

## Comparison with LaunchDarkly

If you're migrating from LaunchDarkly, here's a quick comparison:

| LaunchDarkly | Featureflow |
|--------------|-------------|
| `LDProvider` | `FeatureflowProvider` |
| `useLDClient()` | `useFeatureflow()` |
| `useFlags()` | `useFeatures()` |
| `useBoolVariation()` | `useBooleanFlag()` |
| `useStringVariation()` | `useStringFlag()` |
| `client.track()` | `client.goal()` |
| `client.identify()` | `client.updateUser()` |

## Requirements

- React Native >= 0.60.0
- React >= 16.8.0 (Hooks support)
- @react-native-async-storage/async-storage >= 1.17.0

## Related Packages

- [featureflow-client](https://github.com/featureflow/featureflow-javascript-sdk) - JavaScript/Browser SDK
- [react-featureflow-client](https://github.com/featureflow/react-featureflow-client) - React Web SDK
- [featureflow-node-sdk](https://github.com/featureflow/featureflow-node-sdk) - Node.js Server SDK

## Examples

### Expo Example (Recommended)

The easiest way to try the SDK - no native build tools required:

```bash
cd example-expo
npm install
npm start
```

Then scan the QR code with **Expo Go** on your phone, or press `i` for iOS Simulator / `a` for Android Emulator.

### React Native CLI Example

For bare React Native projects. See `example/README.md` for setup instructions (requires generating native project files).

## License

Apache-2.0

## Support

- 📚 [Documentation](https://docs.featureflow.io)
- 🐛 [Issues](https://github.com/featureflow/featureflow-react-native/issues)
- 💬 [Support](mailto:support@featureflow.io)

