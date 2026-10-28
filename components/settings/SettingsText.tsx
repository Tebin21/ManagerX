import React from 'react';
import { StyleSheet, Text as RNText, TextProps, TextStyle } from 'react-native';
import { useLanguageStore } from '@/store/languageStore';
import i18n from '@/lib/i18n';
import { applyKurdishFont, withSystemFontLatin, hasKurdishScript } from '@/lib/settingsFont';
import { useSettingsStore } from '@/store/settingsStore';
import { getScaleFactor } from '@/constants/scale';

function SettingsText({ style, children, ...props }: TextProps) {
  const lang = useLanguageStore((s) => s.language);
  const isKurdishLang = lang === 'ku' || (!lang && (i18n.language === 'ku' || !i18n.language));
  const hasKurdish = hasKurdishScript(children);
  const isKurdish = hasKurdish || isKurdishLang;
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
    <RNText {...props} style={applyKurdishFont(hasKurdish, scaledStyle as never)}>
      {hasKurdish ? withSystemFontLatin(children, scaledStyle) : children}
    </RNText>
  );
}

export const Text = SettingsText;
