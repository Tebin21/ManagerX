import React from 'react';
import { StyleSheet, Text as RNText, TextProps, TextStyle } from 'react-native';
import { useLanguageStore } from '@/store/languageStore';
import i18n from '@/lib/i18n';
import { applyKurdishFont, withSystemFontLatin, hasKurdishScript } from '@/lib/settingsFont';
import { toEnglishDigits } from '@/utils/formatters';
import { useSettingsStore } from '@/store/settingsStore';
import { getScaleFactor } from '@/constants/scale';

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
// Also reactively applies user-selected global UI scaling (1-10 levels).
function AppText({ style, children, ...props }: TextProps) {
  const lang = useLanguageStore((s) => s.language);
  const isKurdishLang = lang === 'ku' || (!lang && (i18n.language === 'ku' || !i18n.language));
  const normalizedChildren = convertDigitsInNode(children);
  const hasKurdish = hasKurdishScript(normalizedChildren);
  const appScaleLevel = useSettingsStore((s) => s.appScaleLevel ?? 5);
  const scale = getScaleFactor(appScaleLevel);

  const parentStyle = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const baseFontSize = typeof parentStyle.fontSize === 'number' ? parentStyle.fontSize : 14;
  const scaledStyle: TextStyle = scale !== 1.0
    ? {
        ...parentStyle,
        fontSize: Math.round(baseFontSize * scale * 10) / 10,
        ...(typeof parentStyle.lineHeight === 'number'
          ? { lineHeight: Math.round(parentStyle.lineHeight * scale * 10) / 10 }
          : {}),
      }
    : parentStyle;

  return (
    <RNText
      maxFontSizeMultiplier={props.maxFontSizeMultiplier ?? 1.25}
      {...props}
      style={applyKurdishFont(hasKurdish, scaledStyle as never)}
    >
      {hasKurdish ? withSystemFontLatin(normalizedChildren, scaledStyle) : normalizedChildren}
    </RNText>
  );
}

// Explicit const — avoids TypeScript confusing the export alias `Text`
// with the local RNText import when consumers do `import { Text }`.
export const Text = AppText;
