const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const protocolRoot = path.resolve(projectRoot, '../../packages/protocol');

const config = getDefaultConfig(projectRoot);

// Shared event/data contracts live outside the app folder.
config.watchFolders = [protocolRoot];
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@storyloom/protocol': path.join(protocolRoot, 'src'),
};
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

// Resolve *.tv.tsx before *.tsx when building for TV.
if (process.env.EXPO_TV === '1') {
  const exts = config.resolver.sourceExts;
  config.resolver.sourceExts = [...exts.map((e) => `tv.${e}`), ...exts];
}

module.exports = config;
