import React from 'react';
import type { ComponentProps } from 'react';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont } from '@/lib/settingsFont';

// Drop-in replacement for AppTextInput, used only by Settings screens.
// Forwards everything unchanged except the typed text, label, and error
// fonts, which switch to the Kurdish typeface when the app language is
// Kurdish.
export function SettingsTextInput(props: ComponentProps<typeof AppTextInput>) {
  const isKurdish = useLanguageStore((s) => s.language === 'ku');
  return (
    <AppTextInput
      {...props}
      style={applyKurdishFont(isKurdish, props.style as never)}
      labelStyle={applyKurdishFont(isKurdish, props.labelStyle)}
      errorStyle={applyKurdishFont(isKurdish, props.errorStyle)}
    />
  );
}
