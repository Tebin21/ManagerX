const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Allow .wasm assets (expo-sqlite web)
config.resolver.assetExts.push('wasm');

// Apply NativeWind first so we can safely wrap its resolveRequest
const finalConfig = withNativeWind(config, { input: './global.css' });

// Fix: "Cannot destructure property '__extends' of 'tslib.default' as undefined"
// Metro on web picks up tslib's ESM export; force the CJS entry for all platforms.
const nativeWindResolve = finalConfig.resolver.resolveRequest;
finalConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib') {
    return { type: 'sourceFile', filePath: require.resolve('tslib') };
  }
  if (nativeWindResolve) {
    return nativeWindResolve(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = finalConfig;
