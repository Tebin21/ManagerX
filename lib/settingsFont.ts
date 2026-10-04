import React from 'react';
import { StyleSheet, Text as RNText, TextInputProps, TextStyle } from 'react-native';
import { resolveInterFont } from '@/constants/typography';

// Loaded in app/_layout.tsx. These are the app-wide Kurdish typefaces (Bahij Janna):
// - Regular (رفيع) for body/normal weights
// - Bold (عريض) for semibold/bold weights
export const SETTINGS_KURDISH_FONT_REGULAR = 'BahijJanna-Regular';
export const SETTINGS_KURDISH_FONT_BOLD = 'BahijJanna-Bold';

// Kept for backward compatibility with direct callers
export const SETTINGS_KURDISH_FONT = SETTINGS_KURDISH_FONT_REGULAR;

/**
 * Resolves the appropriate Bahij Janna font family based on the requested fontWeight.
 * In Arabic/Kurdish typography, 600+ maps to Bold (عريض), while normal/400/500 maps to Regular (رفيع).
 */
export function resolveKurdishFont(weight?: TextStyle['fontWeight']): string {
  const w = String(weight ?? '');
  if (w === '600' || w === '700' || w === '800' || w === '900' || w === 'bold') {
    return SETTINGS_KURDISH_FONT_BOLD;
  }
  return SETTINGS_KURDISH_FONT_REGULAR;
}

// Kurdish glyphs in Bahij Janna sit taller in their line box than Latin (Inter), so a
// lineHeight tuned for English clips descenders/diacritics. Floor it at 1.50x
// the resolved fontSize instead of hardcoding one value, since app text
// spans many sizes (10–30). Never lowers a lineHeight the caller already set.
const KURDISH_LINE_HEIGHT_RATIO = 1.50;

/**
 * Applies the app-wide font for the current language to a <Text> style.
 * English / Latin / Numbers: resolves the caller's own fontWeight to the matching loaded Inter
 * file instead of leaving fontFamily unset.
 * Kurdish: Bahij Janna (Regular or Bold depending on weight) + line-height floor.
 */
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
      fontFamily: resolveKurdishFont(flat.fontWeight),
      fontWeight: 'normal',
      lineHeight: Math.max(flat.lineHeight ?? 0, minLineHeight),
    },
  ] as unknown as T;
}

// Matches a run of Latin letters/digits plus any directly-attached Latin
// punctuation/symbols, stopping only at the first Kurdish character.
// Deliberately broad — covers plain numbers ("0005"), mixed alphanumeric IDs
// ("A3069"), dates with month abbreviations ("23-Jun-2026"), times with
// AM/PM ("2:19 PM"), currency with a unit suffix ("20,000 IQD"), emails
// ("support@froshiar.store"), English product names ("iPhone 15 Pro"),
// and parenthesized expressions ("(20%)").
const LATIN_TOKEN =
  /[+\-−#$€£¥(]?[A-Za-z0-9#$€£¥@](?:[A-Za-z0-9#$€£¥@ .,:%/+\-–—×_'"()&]*[A-Za-z0-9#$€£¥@.,:%/+\-–—×_'"()&])?/g;

export interface TextRun {
  text: string;
  latin: boolean;
}

// Unicode range covering the Arabic script block Kurdish Sorani is written
// in (its extra letters — ڕ ۆ ڵ ێ پ چ ژ گ ە — all live inside this block),
// plus the Arabic Supplement/Extended-A and presentation-form blocks for
// defensive coverage.
const KURDISH_SCRIPT = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

export function containsKurdishScript(value: string): boolean {
  return KURDISH_SCRIPT.test(value);
}

/**
 * Checks whether a ReactNode tree contains any Kurdish-script text at all.
 * If false, the text is pure Latin / numbers / symbols and MUST NEVER use the Kurdish font.
 */
export function hasKurdishScript(node: React.ReactNode): boolean {
  if (node == null || typeof node === 'boolean') return false;
  if (typeof node === 'string') return containsKurdishScript(node);
  if (typeof node === 'number') return false;
  if (Array.isArray(node)) {
    return node.some(hasKurdishScript);
  }
  if (React.isValidElement(node) && node.props && (node.props as { children?: React.ReactNode }).children) {
    return hasKurdishScript((node.props as { children?: React.ReactNode }).children);
  }
  return false;
}

export function splitLatinRuns(value: string): TextRun[] {
  // If there are no Kurdish characters at all in the string, the entire string
  // is pure Latin / digits / symbols — never apply Kurdish font to it.
  if (!containsKurdishScript(value)) {
    return [{ text: value, latin: true }];
  }

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

const LRI = '⁦'; // Left-to-Right Isolate
const PDI = '⁩'; // Pop Directional Isolate (closes LRI)

/**
 * Isolates Latin runs (IDs, phone numbers, prices, dates, times,
 * English product names, emails, ...) into a nested <Text> forced to the same Inter
 * weight the parent requested (so e.g. a bold Kurdish label's embedded date
 * stays visually bold, not reset to regular) plus `writingDirection: 'ltr'`
 * so the run's bidi direction is isolated too — everything else (Kurdish
 * words) is left untouched and inherits Bahij Janna.
 */
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
// the Kurdish font entirely rather than render its digits in Bahij Janna.
export const NUMERIC_KEYBOARD_TYPES = new Set<TextInputProps['keyboardType']>([
  'numeric', 'phone-pad', 'decimal-pad', 'number-pad', 'numbers-and-punctuation',
]);

/**
 * Decides whether an editable TextInput should use the Kurdish font for its
 * ENTIRE value. Unlike display text, an input can't split fonts per
 * character, so this picks one font for the whole field based on what's
 * actually been typed: a non-empty value containing zero Kurdish-script
 * characters (e.g. a barcode/SKU/email typed with a full keyboard) always
 * gets the Latin font, even when the app language is Kurdish.
 */
export function resolveInputIsKurdish(opts: LatinAwareInputStyleOptions): boolean {
  if (!opts.isKuLanguage) return false;
  if (opts.forceLatin) return false;
  if (NUMERIC_KEYBOARD_TYPES.has(opts.keyboardType)) return false;
  if (opts.value && !containsKurdishScript(opts.value)) return false;
  return true;
}
