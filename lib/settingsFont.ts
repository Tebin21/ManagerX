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
// any Latin letters and digits — in Rudaw. AppText splits out Latin runs
// (IDs, phone numbers, invoice/receipt numbers, prices, percentages, dates,
// times, English product names, ...) into a nested <Text> forced back to
// this value, so they always render in the platform default font regardless
// of the surrounding Kurdish text. 'System' and 'sans-serif' are the
// platform font names that actually override an inherited custom fontFamily
// — plain `undefined` does not (an inherited value wins over an explicitly-
// undefined one), so this can't just be left unset.
export const SYSTEM_FONT_OVERRIDE = Platform.select<string>({ ios: 'System', default: 'sans-serif' });

// Matches a run of Latin letters/digits plus any directly-attached Latin
// punctuation/symbols, stopping only at the first Kurdish character.
// Deliberately broad — covers plain numbers ("0005"), mixed alphanumeric IDs
// ("A3069"), dates with month abbreviations ("23-Jun-2026"), times with
// AM/PM ("2:19 PM"), currency with a unit suffix ("20,000 IQD"), and English
// words/product names ("Sharo Pro Max") — so each renders as ONE
// uninterrupted system-font run instead of being chopped at the first letter
// (which used to leave e.g. "Jun"/"AM"/"IQD"/a leading ID letter in Rudaw
// while the digits next to them switched font, producing a visible mismatch
// within a single value). A run may start with a sign (+/-/−) directly
// before a letter or digit, and never ends on a trailing space, so it
// doesn't swallow a Kurdish word that follows.
const LATIN_TOKEN =
  /[+\-−]?[A-Za-z0-9#$](?:[A-Za-z0-9#$ .,:%/+\-–—×_'"()&]*[A-Za-z0-9#$.,:%/+\-–—×_'"()&])?/g;

export interface TextRun {
  text: string;
  latin: boolean;
}

export function splitLatinRuns(value: string): TextRun[] {
  const runs: TextRun[] = [];
  let lastIndex = 0;
  for (const match of value.matchAll(LATIN_TOKEN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) runs.push({ text: value.slice(lastIndex, start), latin: false });
    runs.push({ text: match[0], latin: true });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < value.length) runs.push({ text: value.slice(lastIndex), latin: false });
  return runs;
}
