import React from 'react';
import type { ComponentProps } from 'react';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont } from '@/lib/settingsFont';

// Drop-in replacement for PrimaryButton, used only by Settings screens.
// Forwards everything unchanged except the label font, which switches to
// the Kurdish typeface when the app language is Kurdish.
export function SettingsPrimaryButton(props: ComponentProps<typeof PrimaryButton>) {
  const isKurdish = useLanguageStore((s) => s.language === 'ku');
  return <PrimaryButton {...props} labelStyle={applyKurdishFont(isKurdish, props.labelStyle)} />;
}
