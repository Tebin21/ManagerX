import React from 'react';
import { StyleSheet, Text as RNText, TextProps, TextStyle } from 'react-native';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont, withSystemFontLatin } from '@/lib/settingsFont';

// Drop-in replacement for components/ui/AppText's `Text`, used only by
// Settings screens/components. Renders the Kurdish typeface (Rudaw) when
// the app language is Kurdish; falls through to the default font
// (Inter/system) untouched for English — never used outside Settings.
// Mirrors AppText's structure exactly (same shared withSystemFontLatin
// Latin-run splitter) so Kurdish sentences with embedded Latin/digit data
// (e.g. "100 USD = {{rate}} IQD") don't get forced entirely into Rudaw.
function SettingsText({ style, children, ...props }: TextProps) {
  const isKurdish = useLanguageStore((s) => s.language === 'ku');
  const parentStyle = isKurdish ? (StyleSheet.flatten(style) as TextStyle | undefined) : undefined;
  return (
    <RNText {...props} style={applyKurdishFont(isKurdish, style as never)}>
      {isKurdish ? withSystemFontLatin(children, parentStyle) : children}
    </RNText>
  );
}

export const Text = SettingsText;
