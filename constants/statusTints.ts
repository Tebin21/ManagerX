import { hexToRgba } from '@/lib/colorUtils';
import type { AppColors } from '@/contexts/ThemeContext';

type Tone = 'success' | 'warning' | 'error';

// Exact literals already used across the app today — kept byte-for-byte so Light Mode is unchanged.
const LIGHT_TINTS: Record<Tone, { bg: string; text: string }> = {
  success: { bg: '#DCFCE7', text: '#166534' },
  warning: { bg: '#FEF3C7', text: '#92400E' },
  error:   { bg: '#FEE2E2', text: '#B91C1C' },
};

export function getStatusTint(tone: Tone, colors: AppColors, isDark: boolean) {
  if (!isDark) return { ...LIGHT_TINTS[tone], border: colors[tone] };
  return {
    bg:     hexToRgba(colors[tone], 0.18),
    text:   colors[tone],
    // Dark surfaces already carry the tone via bg/text — a full-opacity border
    // on top of that reads as a glowing outline, so it's toned down here instead
    // of reusing the raw semantic color like the light-mode border does.
    border: hexToRgba(colors[tone], 0.4),
  };
}

// One-off blue accent (e.g. "FIB"/edit badges) that predates the gold rebrand
// and isn't one of the app's success/warning/error tones — kept separate from
// getStatusTint's Tone union rather than conflating it with colors.info (gold).
const BLUE_ACCENT_LIGHT = { bg: '#DBEAFE', text: '#1E40AF' };
const BLUE_ACCENT_DARK  = '#60A5FA';

export function getBlueTint(isDark: boolean) {
  if (!isDark) return BLUE_ACCENT_LIGHT;
  return { bg: hexToRgba(BLUE_ACCENT_DARK, 0.18), text: BLUE_ACCENT_DARK };
}
