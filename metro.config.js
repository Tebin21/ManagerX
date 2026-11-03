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

// Pre-cache metro error formatting modules so they are never read under high fd load
try {
  require('@expo/metro/metro/lib/formatBundlingError');
} catch {}

// Intercept Expo CLI's aggressive handleTooManyOpenFileErrors so transient EMFILEs don't terminate Metro
const origListeners = process.rawListeners('uncaughtException');
for (const listener of origListeners) {
  if (listener.name === 'handleTooManyOpenFileErrors') {
    process.removeListener('uncaughtException', listener);
    process.on('uncaughtException', (err) => {
      if (err?.code === 'EMFILE') {
        console.warn('[Metro] Ignored transient EMFILE error, server stays alive:', err.message);
        return;
      }
      listener(err);
    });
  }
}

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

// Production code obfuscation, dead-code elimination, and console stripping
const isProduction = process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production';
finalConfig.transformer = {
  ...finalConfig.transformer,
  minifierPath: require.resolve('metro-minify-terser'),
  minifierConfig: {
    ...finalConfig.transformer?.minifierConfig,
    ecma: 8,
    keep_classnames: false,
    keep_fnames: false,
    mangle: {
      toplevel: isProduction,
      keep_fnames: false,
      keep_classnames: false,
    },
    compress: {
      ...(finalConfig.transformer?.minifierConfig?.compress || {}),
      drop_console: isProduction,
      drop_debugger: isProduction,
      passes: 2,
    },
    output: {
      ascii_only: true,
      comments: false,
    },
  },
};

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
