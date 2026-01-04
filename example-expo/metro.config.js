const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch both the example app and the SDK source
config.watchFolders = [workspaceRoot];

// Allow resolving the SDK from the parent directory
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Don't block the SDK, just block duplicate node_modules
config.resolver.blockList = [
  // Exclude the parent's node_modules to avoid duplicate React instances
  new RegExp(path.resolve(workspaceRoot, 'node_modules', 'react-native') + '/.*'),
  new RegExp(path.resolve(workspaceRoot, 'node_modules', 'react') + '/.*'),
];

// Extra node modules for the SDK
config.resolver.extraNodeModules = {
  '@featureflow/react-native-sdk': workspaceRoot,
};

module.exports = config;
