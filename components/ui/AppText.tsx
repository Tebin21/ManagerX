import React from 'react';
import { StyleSheet, Text as RNText, TextProps, TextStyle } from 'react-native';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont, withSystemFontLatin } from '@/lib/settingsFont';

// The single shared Text component used app-wide — this is where the
// Kurdish typeface is applied, so every screen gets it automatically
// whenever the app language is Kurdish, with no per-screen wiring.
function AppText({ style, children, ...props }: TextProps) {
  const isKurdish = useLanguageStore((s) => s.language === 'ku');
  const parentStyle = isKurdish ? (StyleSheet.flatten(style) as TextStyle | undefined) : undefined;
  return (
    <RNText {...props} style={applyKurdishFont(isKurdish, style as never)}>
      {isKurdish ? withSystemFontLatin(children, parentStyle) : children}
    </RNText>
  );
}

// Explicit const — avoids TypeScript confusing the export alias `Text`
// with the local RNText import when consumers do `import { Text }`.
export const Text = AppText;
