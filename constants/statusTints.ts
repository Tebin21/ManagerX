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
  if (!isDark) return LIGHT_TINTS[tone];
  return {
    bg:   hexToRgba(colors[tone], 0.18),
    text: colors[tone],
  };
}
