import React from 'react';
import type { ComponentProps } from 'react';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

// Drop-in replacement for PrimaryButton, used only by Settings screens.
// PrimaryButton already renders its label through AppText's `Text`, which
// applies the Kurdish typeface itself whenever the app language is Kurdish
// (and always wins over any font this wrapper could set, since AppText's
// own override is applied last) — so this is a pure pass-through.
export function SettingsPrimaryButton(props: ComponentProps<typeof PrimaryButton>) {
  return <PrimaryButton {...props} />;
}
