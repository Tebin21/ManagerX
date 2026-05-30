import React from 'react';
import { Text as RNText, TextProps } from 'react-native';

export function AppText({ style, ...props }: TextProps) {
  return <RNText {...props} style={style} />;
}

// Explicit const — avoids TypeScript confusing the export alias `Text`
// with the local RNText import when consumers do `import { Text }`.
export const Text = AppText;
