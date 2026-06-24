import React from 'react';
import { StyleSheet, Text as RNText, TextProps, TextStyle } from 'react-native';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont, splitLatinRuns } from '@/lib/settingsFont';
import { resolveInterFont } from '@/constants/typography';

// React Native's fontFamily has no CSS-style fallback list, so a
// Kurdish-styled <Text> would otherwise render Latin letters and digits in
// Rudaw too. Isolate Latin runs (IDs, phone numbers, prices, dates, times,
// English product names, ...) into a nested <Text> forced to the same Inter
// weight the parent requested (so e.g. a bold Kurdish label's embedded date
// stays visually bold, not reset to regular) plus `writingDirection: 'ltr'`
// so the run's bidi direction is isolated too — everything else (Kurdish
// words) is left untouched and keeps inheriting Rudaw.
function withSystemFontLatin(children: React.ReactNode, parentStyle?: TextStyle): React.ReactNode {
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
          ? <RNText key={key++} style={{ fontFamily, writingDirection: 'ltr' }}>{run.text}</RNText>
          : run.text
      );
    }
  }
  return out;
}

// The single shared Text component used app-wide — this is where the
// Kurdish typeface is applied, so every screen gets it automatically
// whenever the app language is Kurdish, with no per-screen wiring.
function AppText({ style, children, ...props }: TextProps) {
  const isKurdish = useLanguageStore((s) => s.language === 'ku');
  const parentStyle = isKurdish ? (StyleSheet.flatten(style) as TextStyle | undefined) : undefined;
  return (
    <RNText {...props} style={applyKurdishFont(isKurdish, style as never)}>
      {isKurdish ? withSystemFontLatin(children, parentStyle) : children}
    </RNText>
  );
}

// Explicit const — avoids TypeScript confusing the export alias `Text`
// with the local RNText import when consumers do `import { Text }`.
export const Text = AppText;
