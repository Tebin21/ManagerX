import React from 'react';
import { StyleSheet, Text as RNText, TextProps, TextStyle } from 'react-native';
import { useLanguageStore } from '@/store/languageStore';
import i18n from '@/lib/i18n';
import { applyKurdishFont, withSystemFontLatin, hasKurdishScript } from '@/lib/settingsFont';

function SettingsText({ style, children, ...props }: TextProps) {
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

export const Text = SettingsText;
