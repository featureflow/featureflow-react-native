# Featureflow React Native SDK - Expo Example

A simple Expo-based example demonstrating the Featureflow React Native SDK.

## Quick Start

### 1. Install Dependencies

```bash
cd example-expo
npm install
```

### 2. Run the App

```bash
# Start Expo
npm start

# Or run directly on a platform
npm run ios      # iOS Simulator
npm run android  # Android Emulator
npm run web      # Web Browser
```

### 3. Open on Device

Scan the QR code with:
- **iOS**: Camera app or Expo Go app
- **Android**: Expo Go app

## What This Demo Shows

| Feature | Hook/Method | Description |
|---------|-------------|-------------|
| Boolean Flags | `useBooleanFlag()` | Simple on/off feature toggle |
| String Flags | `useStringFlag()` | Multi-variant A/B testing |
| All Features | `useFeatures()` | View all evaluated features |
| Status | `useFeatureflowStatus()` | Loading and error states |
| Goals | `goal()` | Track conversion events |
| User Context | `updateUser()` | Change user at runtime |

## Demo Features

The example runs in **offline mode** with these default features:

```javascript
{
  'hello-world': 'on',
  'color-theme': 'blue',
  'beta-feature': 'off'
}
```

## Using Real Features

To connect to Featureflow:

1. Get your API key from [app.featureflow.com](https://app.featureflow.com)
2. Edit `App.tsx`:
   ```typescript
   const FEATUREFLOW_API_KEY = 'js-env-YOUR_KEY_HERE';
   ```
3. Set `offline: false` in the config

## Screenshot

The app displays:
- A status banner showing initialization state
- Boolean flag demo with visual indicator
- String flag demo with color variants
- Goal tracking buttons
- Feature list display
- User context editor

## Troubleshooting

### Clear Cache

```bash
npx expo start --clear
```

### Reset Project

```bash
rm -rf node_modules
npm install
```

