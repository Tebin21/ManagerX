import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont, splitNumericRuns, SYSTEM_FONT_OVERRIDE } from '@/lib/settingsFont';

// React Native's fontFamily has no CSS-style fallback list, so a
// Kurdish-styled <Text> would otherwise render digits in Rudaw too. Isolate
// numeric runs (phone numbers, prices, dates, IDs, ...) into a nested <Text>
// forced back to the system font — everything else (Kurdish words, and any
// other text) is left untouched and keeps inheriting Rudaw.
function withSystemFontNumerals(children: React.ReactNode): React.ReactNode {
  const items = Array.isArray(children) ? children : [children];
  const out: React.ReactNode[] = [];
  let key = 0;
  for (const child of items) {
    if (typeof child !== 'string' && typeof child !== 'number') {
      out.push(child);
      continue;
    }
    const runs = splitNumericRuns(String(child));
    if (runs.length === 0 || (runs.length === 1 && !runs[0].numeric)) {
      out.push(child);
      continue;
    }
    for (const run of runs) {
      if (!run.text) continue;
      out.push(
        run.numeric
          ? <RNText key={key++} style={{ fontFamily: SYSTEM_FONT_OVERRIDE }}>{run.text}</RNText>
          : run.text
      );
    }
  }
  return out;
}

// The single shared Text component used app-wide — this is where the
// Kurdish typeface is applied, so every screen gets it automatically
// whenever the app language is Kurdish, with no per-screen wiring.
export function AppText({ style, children, ...props }: TextProps) {
  const isKurdish = useLanguageStore((s) => s.language === 'ku');
  return (
    <RNText {...props} style={applyKurdishFont(isKurdish, style as never)}>
      {isKurdish ? withSystemFontNumerals(children) : children}
    </RNText>
  );
}

// Explicit const — avoids TypeScript confusing the export alias `Text`
// with the local RNText import when consumers do `import { Text }`.
export const Text = AppText;
