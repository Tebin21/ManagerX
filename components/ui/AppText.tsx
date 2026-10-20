import React from 'react';
import { StyleSheet, Text as RNText, TextProps, TextStyle } from 'react-native';
import { useLanguageStore } from '@/store/languageStore';
import i18n from '@/lib/i18n';
import { applyKurdishFont, withSystemFontLatin, hasKurdishScript } from '@/lib/settingsFont';
import { toEnglishDigits } from '@/utils/formatters';

function convertDigitsInNode(node: React.ReactNode): React.ReactNode {
  if (node == null || typeof node === 'boolean') return node;
  if (typeof node === 'string') {
    return /[٠-٩۰-۹]/.test(node) ? toEnglishDigits(node) : node;
  }
  if (typeof node === 'number') return node;
  if (Array.isArray(node)) {
    return node.map(convertDigitsInNode);
  }
  return node;
}

// The single shared Text component used app-wide.
// Whenever the text contains Kurdish characters (or the app language is Kurdish),
// Bahij Janna is applied to the Kurdish text, while numbers and Latin letters
// strictly remain in Inter/system fonts.
function AppText({ style, children, ...props }: TextProps) {
  const lang = useLanguageStore((s) => s.language);
  const isKurdishLang = lang === 'ku' || (!lang && (i18n.language === 'ku' || !i18n.language));
  const normalizedChildren = convertDigitsInNode(children);
  const hasKurdish = hasKurdishScript(normalizedChildren);

  const parentStyle = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  return (
    <RNText {...props} style={applyKurdishFont(hasKurdish, style as never)}>
      {hasKurdish ? withSystemFontLatin(normalizedChildren, parentStyle) : normalizedChildren}
    </RNText>
  );
}

// Explicit const — avoids TypeScript confusing the export alias `Text`
// with the local RNText import when consumers do `import { Text }`.
export const Text = AppText;
