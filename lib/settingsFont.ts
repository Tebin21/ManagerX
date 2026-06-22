import { Platform, StyleSheet, TextStyle } from 'react-native';

// Loaded in app/_layout.tsx. This is the app-wide Kurdish typeface — applied
// by components/ui/AppText.tsx (and AppTextInput's raw TextInput), so every
// screen that renders text through the shared Text component gets it
// automatically whenever the app language is Kurdish.
export const SETTINGS_KURDISH_FONT = 'RudawRegular';

// Kurdish glyphs sit taller in their line box than Latin (Inter), so a
// lineHeight tuned for English clips descenders/diacritics. Floor it at 1.45x
// the resolved fontSize instead of hardcoding one value, since app text
// spans many sizes (10–30). Never lowers a lineHeight the caller already set.
const KURDISH_LINE_HEIGHT_RATIO = 1.45;

export function applyKurdishFont<T extends TextStyle | TextStyle[] | undefined>(
  isKurdish: boolean,
  style?: T
): TextStyle | T {
  if (!isKurdish) return style as T;

  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const fontSize = typeof flat.fontSize === 'number' ? flat.fontSize : 14;
  const minLineHeight = Math.ceil(fontSize * KURDISH_LINE_HEIGHT_RATIO);

  return [
    style,
    {
      fontFamily: SETTINGS_KURDISH_FONT,
      lineHeight: Math.max(flat.lineHeight ?? 0, minLineHeight),
    },
  ] as unknown as TextStyle;
}

// React Native's `fontFamily` takes a single name, not a CSS-style fallback
// list, so a Kurdish-styled <Text> renders its *entire* content — including
// any digits — in Rudaw. AppText splits out numeric runs (phone numbers,
// invoice/receipt numbers, prices, percentages, dates, times, ...) into a
// nested <Text> forced back to this value, so numbers always render in the
// platform default font regardless of the surrounding Kurdish text. 'System'
// and 'sans-serif' are the platform font names that actually override an
// inherited custom fontFamily — plain `undefined` does not (an inherited
// value wins over an explicitly-undefined one), so this can't just be left
// unset.
export const SYSTEM_FONT_OVERRIDE = Platform.select<string>({ ios: 'System', default: 'sans-serif' });

// Matches a numeric token plus any directly-attached numeric punctuation —
// thousands separators, decimals, percent signs, time/date separators, a
// leading currency/ID marker (# or $), and a leading sign — but stops at the
// first letter or Kurdish character. Deliberately narrow: only digits and
// their immediate punctuation are forced to the system font; surrounding
// Kurdish (and any other) words keep rendering in Rudaw unchanged.
const NUMERIC_TOKEN = /[#$]?[+\-−]?\d[\d.,:%/-]*/g;

export interface TextRun {
  text: string;
  numeric: boolean;
}

export function splitNumericRuns(value: string): TextRun[] {
  const runs: TextRun[] = [];
  let lastIndex = 0;
  for (const match of value.matchAll(NUMERIC_TOKEN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) runs.push({ text: value.slice(lastIndex, start), numeric: false });
    runs.push({ text: match[0], numeric: true });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < value.length) runs.push({ text: value.slice(lastIndex), numeric: false });
  return runs;
}
