// Ensure /opt/homebrew/bin is in PATH for child processes & watchman capability checks
if (!process.env.PATH?.includes('/opt/homebrew/bin')) {
  process.env.PATH = `/opt/homebrew/bin:/opt/homebrew/sbin:${process.env.PATH || ''}`;
}

// Prevent EMFILE crashes by patching Node fs with graceful-fs retry queues
try {
  const fs = require('fs');
  const gracefulFs = require('graceful-fs');
  gracefulFs.gracefulify(fs);
} catch {}

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Allow .wasm assets (expo-sqlite web)
config.resolver.assetExts.push('wasm');

// Block non-application directories from file watchers
const defaultBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : config.resolver.blockList ? [config.resolver.blockList] : [];

config.resolver.blockList = [
  ...defaultBlockList,
  /.*[\\/]\.git[\\/].*/,
  /.*[\\/]\.agents[\\/].*/,
];

// Apply NativeWind first so we can safely wrap its resolveRequest
const finalConfig = withNativeWind(config, { input: './global.css' });

// Fix: "Cannot destructure property '__extends' of 'tslib.default' as undefined"
// Metro on web picks up tslib's ESM export; force the CJS entry for all platforms.
const nativeWindResolve = finalConfig.resolver.resolveRequest;
finalConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib') {
    return { type: 'sourceFile', filePath: require.resolve('tslib') };
  }
  // Fix: "Cannot use 'import.meta' outside a module"
  // Metro on web picks zustand's ESM middleware (esm/middleware.mjs) which uses
  // import.meta.env for devtools detection. Force the CJS entry instead.
  if (moduleName === 'zustand/middleware') {
    return { type: 'sourceFile', filePath: require.resolve('zustand/middleware') };
  }
  if (nativeWindResolve) {
    return nativeWindResolve(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

finalConfig.resolver.useWatchman = true;

module.exports = finalConfig;
