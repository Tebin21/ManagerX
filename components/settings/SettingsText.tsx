import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont } from '@/lib/settingsFont';

// Drop-in replacement for components/ui/AppText's `Text`, used only by
// Settings screens/components. Renders the Kurdish typeface (Rudaw) when
// the app language is Kurdish; falls through to the default font
// (Inter/system) untouched for English — never used outside Settings.
export function SettingsText({ style, ...props }: TextProps) {
  const isKurdish = useLanguageStore((s) => s.language === 'ku');
  return <RNText {...props} style={applyKurdishFont(isKurdish, style as never)} />;
}

export const Text = SettingsText;
