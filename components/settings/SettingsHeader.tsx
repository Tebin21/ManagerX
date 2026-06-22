import React from 'react';
import type { ComponentProps } from 'react';
import { AppHeader } from '@/components/common/AppHeader';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont } from '@/lib/settingsFont';

// Drop-in replacement for AppHeader, used only by Settings screens. Forwards
// everything unchanged except the title font, which switches to the Kurdish
// typeface when the app language is Kurdish.
export function SettingsHeader(props: ComponentProps<typeof AppHeader>) {
  const isKurdish = useLanguageStore((s) => s.language === 'ku');
  return <AppHeader {...props} titleStyle={applyKurdishFont(isKurdish, props.titleStyle)} />;
}
