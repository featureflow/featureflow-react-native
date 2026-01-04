# Featureflow React Native SDK - CLI Example

This example is for use with the React Native CLI (bare workflow). It requires generating native iOS/Android project files.

> **For a simpler setup, use the [Expo example](../example-expo) instead!**

## Setup

### 1. Build the SDK first

```bash
cd ..
npm install
npm run build
```

### 2. Create the native project files

Since this example doesn't include the native `ios/` and `android/` directories, you need to generate them:

```bash
cd example

# Install dependencies
npm install

# Generate iOS project
npx react-native-community/cli init FeatureflowExample --directory temp-init
cp -r temp-init/ios .
cp -r temp-init/android .
rm -rf temp-init

# Install iOS pods
cd ios && pod install && cd ..
```

### 3. Run the app

```bash
# iOS
npm run ios

# Android
npm run android
```

## Alternative: Use Expo Example

The **Expo example** is much simpler and doesn't require native builds:

```bash
cd ../example-expo
npm install
npm start
```

Then scan the QR code with Expo Go on your device.

## What This Demo Shows

- `FeatureflowProvider` - Wrapping the app
- `useBooleanFlag` - On/off feature flags
- `useStringFlag` - Multi-variant A/B testing
- `useFeatures` - All evaluated features
- `useFeatureflowStatus` - Loading states
- `goal()` - Conversion tracking
- `updateUser()` - Changing user context
