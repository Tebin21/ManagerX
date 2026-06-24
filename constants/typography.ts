import { TextStyle } from 'react-native';

// Single source of truth for "requested weight" -> "actual loaded Inter file".
// Consumed by lib/settingsFont.ts (both the English-mode path and the
// Kurdish-mode Latin-run override), so every English letter, ID, date, time,
// and number in the app resolves to the same real font file instead of the
// OS default + synthetic bolding. All five weights are loaded in app/_layout.tsx.
export const INTER_FONT_BY_WEIGHT: Record<string, string> = {
  '100': 'Inter_400Regular',
  '200': 'Inter_400Regular',
  '300': 'Inter_400Regular',
  '400': 'Inter_400Regular',
  normal: 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
  bold: 'Inter_700Bold',
  '800': 'Inter_800ExtraBold',
  '900': 'Inter_900Black',
};

export function resolveInterFont(weight?: TextStyle['fontWeight']): string {
  if (!weight) return INTER_FONT_BY_WEIGHT['400'];
  return INTER_FONT_BY_WEIGHT[String(weight)] ?? INTER_FONT_BY_WEIGHT['400'];
}

// Semantic presets for the 4 data types singled out for consistency
// (IDs/codes, currency amounts, dates, times) plus the common label/title/body
// roles screens already reach for ad hoc. fontSize/fontWeight/lineHeight only —
// color stays caller-controlled since it depends on context (success/error/gray).
export const Typography = {
  id: { fontSize: 12, fontWeight: '600', lineHeight: 16 } as TextStyle,
  idSmall: { fontSize: 11, fontWeight: '600', lineHeight: 14 } as TextStyle,

  amountSmall: { fontSize: 12, fontWeight: '600', lineHeight: 16 } as TextStyle,
  amount: { fontSize: 14, fontWeight: '700', lineHeight: 18 } as TextStyle,
  amountLarge: { fontSize: 18, fontWeight: '800', lineHeight: 24 } as TextStyle,
  amountHero: { fontSize: 24, fontWeight: '800', lineHeight: 30 } as TextStyle,

  dateSmall: { fontSize: 11, fontWeight: '500', lineHeight: 14 } as TextStyle,
  date: { fontSize: 12, fontWeight: '500', lineHeight: 16 } as TextStyle,
  time: { fontSize: 12, fontWeight: '500', lineHeight: 16 } as TextStyle,

  labelSmall: { fontSize: 10, fontWeight: '600', lineHeight: 13 } as TextStyle,
  label: { fontSize: 11, fontWeight: '600', lineHeight: 14 } as TextStyle,

  body: { fontSize: 14, fontWeight: '400', lineHeight: 20 } as TextStyle,
  bodySmall: { fontSize: 12, fontWeight: '400', lineHeight: 16 } as TextStyle,

  cardTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20 } as TextStyle,
  title: { fontSize: 17, fontWeight: '600', lineHeight: 22 } as TextStyle,
} as const;
