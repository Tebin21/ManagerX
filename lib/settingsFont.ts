import React from 'react';
import { StyleSheet, Text as RNText, TextInputProps, TextStyle } from 'react-native';
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

// Matches a run of Latin letters/digits plus any directly-attached Latin
// punctuation/symbols, stopping only at the first Kurdish character.
// Deliberately broad — covers plain numbers ("0005"), mixed alphanumeric IDs
// ("A3069"), dates with month abbreviations ("23-Jun-2026"), times with
// AM/PM ("2:19 PM"), currency with a unit suffix ("20,000 IQD"), emails
// ("support@froshiar.store" — "@" included so the address doesn't fracture
// around it), and English words/product names ("Sharo Pro Max") — so each
// renders as ONE uninterrupted system-font run instead of being chopped at
// the first letter (which used to leave e.g. "Jun"/"AM"/"IQD"/a leading ID
// letter in Rudaw while the digits next to them switched font, producing a
// visible mismatch within a single value). A run may start with a sign
// (+/-/−) directly before a letter or digit, and never ends on a trailing
// space, so it doesn't swallow a Kurdish word that follows.
const LATIN_TOKEN =
  /[+\-−]?[A-Za-z0-9#$@](?:[A-Za-z0-9#$@ .,:%/+\-–—×_'"()&]*[A-Za-z0-9#$@.,:%/+\-–—×_'"()&])?/g;

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

// Unicode range covering the Arabic script block Kurdish Sorani is written
// in (its extra letters — ڕ ۆ ڵ ێ — all live inside the base Arabic block),
// plus the Arabic Supplement/Extended-A and presentation-form blocks for
// defensive coverage. Used to decide, for a single-font editable TextInput
// (which can't split runs the way <Text> can), whether the field's current
// value is Kurdish-script at all.
const KURDISH_SCRIPT = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

export function containsKurdishScript(value: string): boolean {
  return KURDISH_SCRIPT.test(value);
}

const LRI = '⁦'; // Left-to-Right Isolate
const PDI = '⁩'; // Pop Directional Isolate (closes LRI)

// React Native's fontFamily has no CSS-style fallback list, so a
// Kurdish-styled <Text> would otherwise render Latin letters and digits in
// Rudaw too. Isolate Latin runs (IDs, phone numbers, prices, dates, times,
// English product names, ...) into a nested <Text> forced to the same Inter
// weight the parent requested (so e.g. a bold Kurdish label's embedded date
// stays visually bold, not reset to regular) plus `writingDirection: 'ltr'`
// so the run's bidi direction is isolated too — everything else (Kurdish
// words) is left untouched and keeps inheriting Rudaw. The run's text is
// also wrapped in real Unicode bidi-isolate characters (LRI/PDI): RN's
// `writingDirection` style is iOS-only (no Android view manager honors it),
// so direction-isolation on Android has to be encoded in the text itself.
// Shared by every "Text with Kurdish-mode Latin-run splitting" consumer
// (AppText, SettingsText, about.tsx) so there is exactly one implementation
// of this logic in the app.
export function withSystemFontLatin(children: React.ReactNode, parentStyle?: TextStyle): React.ReactNode {
  const fontFamily = resolveInterFont(parentStyle?.fontWeight);
  const items = Array.isArray(children) ? children : [children];
  const out: React.ReactNode[] = [];
  let key = 0;
  for (const child of items) {
    if (typeof child !== 'string' && typeof child !== 'number') {
      out.push(child);
      continue;
    }
    const runs = splitLatinRuns(String(child));
    if (runs.length === 0 || (runs.length === 1 && !runs[0].latin)) {
      out.push(child);
      continue;
    }
    for (const run of runs) {
      if (!run.text) continue;
      out.push(
        run.latin
          ? React.createElement(
              RNText,
              { key: key++, style: { fontFamily, writingDirection: 'ltr' as const } },
              LRI + run.text + PDI
            )
          : run.text
      );
    }
  }
  return out;
}

export interface LatinAwareInputStyleOptions {
  isKuLanguage: boolean;
  value?: string;
  keyboardType?: TextInputProps['keyboardType'];
  forceLatin?: boolean;
}

// A single TextInput can't mix fonts per-character the way AppText can for
// display text, so a numeric-only field (phone, price, rate, ...) must skip
// the Kurdish font entirely rather than render its digits in Rudaw.
export const NUMERIC_KEYBOARD_TYPES = new Set<TextInputProps['keyboardType']>([
  'numeric', 'phone-pad', 'decimal-pad', 'number-pad', 'numbers-and-punctuation',
]);

// Decides whether an editable TextInput should use the Kurdish font for its
// ENTIRE value. Unlike display text, an input can't split fonts per
// character, so this picks one font for the whole field based on what's
// actually been typed: a non-empty value containing zero Kurdish-script
// characters (e.g. a barcode/SKU/email typed with a full keyboard) always
// gets the Latin font, even when the app language is Kurdish and the field
// has no numeric keyboardType/forceLatin escape hatch. Empty values keep
// defaulting to the Kurdish font (matches prior behavior, avoids flicker on
// an empty field).
export function resolveInputIsKurdish(opts: LatinAwareInputStyleOptions): boolean {
  if (!opts.isKuLanguage) return false;
  if (opts.forceLatin) return false;
  if (NUMERIC_KEYBOARD_TYPES.has(opts.keyboardType)) return false;
  if (opts.value && !containsKurdishScript(opts.value)) return false;
  return true;
}
