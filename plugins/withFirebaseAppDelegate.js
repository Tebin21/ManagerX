const { withAppDelegate } = require('@expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

// @react-native-firebase/app can't find an insertion point in Expo SDK 54's
// Swift `ExpoAppDelegate` subclass and skips Firebase init entirely. This
// plugin injects it directly so it survives every `expo prebuild`.

const IMPORT_LINE = 'import FirebaseCore';

const CONFIGURE_BLOCK = ['    if FirebaseApp.app() == nil {', '      FirebaseApp.configure()', '    }'].join('\n');

function insertFirebaseInit(contents) {
  // @react-native-firebase/app's own (otherwise-failing) mod already adds this
  // import via a plain string replace before this plugin runs. Guard against
  // double-inserting it if that ever changes upstream.
  if (!contents.includes(IMPORT_LINE)) {
    contents = mergeContents({
      src: contents,
      newSrc: IMPORT_LINE,
      tag: 'firebase-app-import',
      anchor: /^import Expo$/,
      offset: 1,
      comment: '//',
    }).contents;
  }

  contents = mergeContents({
    src: contents,
    newSrc: CONFIGURE_BLOCK,
    tag: 'firebase-app-configure',
    // Anchored on the unique didFinishLaunchingWithOptions parameter line
    // (not `) -> Bool {`, which also closes the other overridden methods),
    // offset 2 lands just after the matching closing brace.
    anchor: /didFinishLaunchingWithOptions launchOptions: \[UIApplication\.LaunchOptionsKey: Any\]\? = nil/,
    offset: 2,
    comment: '//',
  }).contents;

  return contents;
}

function withFirebaseAppDelegate(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error(`withFirebaseAppDelegate: expected AppDelegate.swift, got language "${config.modResults.language}"`);
    }
    config.modResults.contents = insertFirebaseInit(config.modResults.contents);
    return config;
  });
}

module.exports = withFirebaseAppDelegate;
module.exports.insertFirebaseInit = insertFirebaseInit;
