import React from 'react';
import type { ComponentProps } from 'react';
import { AppTextInput } from '@/components/ui/AppTextInput';

// Drop-in replacement for AppTextInput, used only by Settings screens.
// AppTextInput already owns the full Kurdish/Latin font decision internally
// (including value-aware detection of pure-Latin typed content), and always
// wins over any font this wrapper could set on style/labelStyle/errorStyle
// (its own override is applied last) — so this is a pure pass-through.
export function SettingsTextInput(props: ComponentProps<typeof AppTextInput>) {
  return <AppTextInput {...props} />;
}
