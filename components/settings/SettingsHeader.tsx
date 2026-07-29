import React from 'react';
import type { ComponentProps } from 'react';
import { AppHeader } from '@/components/common/AppHeader';

// Drop-in replacement for AppHeader, used only by Settings screens.
// AppHeader already renders its title through AppText's `Text`, which
// applies the Kurdish typeface itself whenever the app language is Kurdish
// (and always wins over any font this wrapper could set, since AppText's
// own override is applied last) — so this is a pure pass-through.
export function SettingsHeader(props: ComponentProps<typeof AppHeader>) {
  return <AppHeader {...props} />;
}
