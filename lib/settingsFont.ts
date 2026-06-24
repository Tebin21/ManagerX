import { Platform, StyleSheet, TextStyle } from 'react-native';
import { resolveInterFont } from '@/constants/typography';

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

// Applies the app-wide font for the current language to a <Text> style.
// English: resolves the caller's own fontWeight to the matching loaded Inter
// file instead of leaving fontFamily unset (which silently falls back to the
// OS default — San Francisco/Roboto — and lets the OS fake-bold every
// fontWeight value, which is what made Latin text/IDs/dates/numbers render
// inconsistently across screens). Kurdish: same as before — RudawRegular +
// the line-height floor. Name kept as `applyKurdishFont` since it's imported
// directly by several Settings-screen wrappers (SettingsText, SettingsHeader,
// SettingsTextInput, SettingsPrimaryButton, AppTextInput, settings/data.tsx).
export function applyKurdishFont<T extends TextStyle | TextStyle[] | undefined>(
  isKurdish: boolean,
  style?: T
): TextStyle | T {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;

  if (!isKurdish) {
    return [style, { fontFamily: resolveInterFont(flat.fontWeight) }] as unknown as T;
  }

  const fontSize = typeof flat.fontSize === 'number' ? flat.fontSize : 14;
  const minLineHeight = Math.ceil(fontSize * KURDISH_LINE_HEIGHT_RATIO);

  return [
    style,
    {
      fontFamily: SETTINGS_KURDISH_FONT,
      lineHeight: Math.max(flat.lineHeight ?? 0, minLineHeight),
    },
  ] as unknown as T;
}

// React Native's `fontFamily` takes a single name, not a CSS-style fallback
// list, so a Kurdish-styled <Text> renders its *entire* content — including
// any Latin letters and digits — in Rudaw. Used directly by a couple of
// screens (settings/about.tsx, purchases/[id].tsx) that do their own Latin-run
// isolation outside AppText's splitter. Kept as the plain platform font (not
// routed through Inter) since those call sites don't know the surrounding
// fontWeight and forcing a single Inter weight could conflict with one they
// already set — AppText's own splitter (below) resolves the real Inter
// weight instead, since it has access to the parent style.
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
