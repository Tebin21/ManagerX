import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TextInputProps, TextStyle } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { MotiView } from 'moti';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont } from '@/lib/settingsFont';
import { Theme } from '@/constants/theme';
import { useKeyboardAwareFocus } from '@/components/common/KeyboardAwareScrollView';
interface Props extends TextInputProps {
  label?: string;
  error?: string;
  rightElement?: React.ReactNode;
  /** Merged onto the label's default style — undefined leaves it unchanged */
  labelStyle?: TextStyle;
  /** Merged onto the error text's default style — undefined leaves it unchanged */
  errorStyle?: TextStyle;
}

// A single TextInput can't mix fonts per-character the way AppText can for
// display text, so a numeric-only field (phone, price, rate, ...) must skip
// the Kurdish font entirely rather than render its digits in Rudaw.
const NUMERIC_KEYBOARD_TYPES = new Set<TextInputProps['keyboardType']>([
  'numeric', 'phone-pad', 'decimal-pad', 'number-pad', 'numbers-and-punctuation',
]);

export function AppTextInput({ label, error, style, rightElement, labelStyle, errorStyle, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const { colors } = useAppTheme();
  const { textAlign } = useRTL();
  const isKurdish = useLanguageStore((s) => s.language === 'ku') && !NUMERIC_KEYBOARD_TYPES.has(rest.keyboardType);
  const scrollIntoView = useKeyboardAwareFocus();
  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.gray600, textAlign }, labelStyle]}>{label}</Text>
      )}
      <MotiView
        animate={{
          borderColor: error
            ? colors.error
            : focused
            ? colors.primary
            : colors.gray200,
          shadowOpacity: focused ? 0.12 : 0,
        }}
        transition={{ type: 'timing', duration: 200 }}
        style={[
          styles.inputWrapper,
          {
            borderColor:     colors.gray200,
            backgroundColor: colors.gray50,
            shadowColor:     colors.primary,
          },
        ]}
      >
        <View style={styles.inputRow}>
          <TextInput
            {...rest}
            style={applyKurdishFont(isKurdish, [styles.input, { flex: 1, color: colors.black, textAlign }, style] as never)}
            placeholderTextColor={colors.gray400}
            onFocus={(e) => {
              setFocused(true);
              scrollIntoView(e);
              rest.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              rest.onBlur?.(e);
            }}
          />
          {rightElement}
        </View>
      </MotiView>
      {error && (
        <Text style={[styles.error, { color: colors.error, textAlign }, errorStyle]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { marginBottom: 16 },
  label: {
    fontSize:      13,
    fontWeight:    '500',
    marginBottom:  6,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    borderWidth:   1.5,
    borderRadius:  Theme.input.borderRadius,
    shadowOffset:  { width: 0, height: 0 },
    shadowRadius:  6,
    elevation:     0,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  input: {
    height:      Theme.input.height,
    paddingStart: 16,
    fontSize:    15,
  },
  error: {
    fontSize:  12,
    marginTop: 4,
  },
});
