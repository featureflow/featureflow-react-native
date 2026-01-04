const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

// Get the root SDK directory
const sdkRoot = path.resolve(__dirname, '..');

const config = {
  watchFolders: [sdkRoot],
  resolver: {
    // Make sure Metro can find the SDK
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(sdkRoot, 'node_modules'),
    ],
    // Ensure we use the example's node_modules for react and react-native
    extraNodeModules: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-native': path.resolve(__dirname, 'node_modules/react-native'),
      '@react-native-async-storage/async-storage': path.resolve(
        __dirname,
        'node_modules/@react-native-async-storage/async-storage',
      ),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

