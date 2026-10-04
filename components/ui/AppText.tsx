import React from 'react';
import { StyleSheet, Text as RNText, TextProps, TextStyle } from 'react-native';
import { useLanguageStore } from '@/store/languageStore';
import i18n from '@/lib/i18n';
import { applyKurdishFont, withSystemFontLatin, hasKurdishScript } from '@/lib/settingsFont';

// The single shared Text component used app-wide.
// Whenever the text contains Kurdish characters (or the app language is Kurdish),
// Bahij Janna is applied to the Kurdish text, while numbers and Latin letters
// strictly remain in Inter/system fonts.
function AppText({ style, children, ...props }: TextProps) {
  const lang = useLanguageStore((s) => s.language);
  const isKurdishLang = lang === 'ku' || (!lang && (i18n.language === 'ku' || !i18n.language));
  const hasKurdish = hasKurdishScript(children);
  const isKurdish = hasKurdish || isKurdishLang;

  const parentStyle = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  return (
    <RNText {...props} style={applyKurdishFont(hasKurdish, style as never)}>
      {hasKurdish ? withSystemFontLatin(children, parentStyle) : children}
    </RNText>
  );
}

// Explicit const — avoids TypeScript confusing the export alias `Text`
// with the local RNText import when consumers do `import { Text }`.
export const Text = AppText;
