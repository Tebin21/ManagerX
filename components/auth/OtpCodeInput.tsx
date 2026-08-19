import React, { useRef } from 'react';
import { View, TextInput, StyleSheet, NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/constants/theme';

const LENGTH = 6;

interface Props {
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  error?: boolean;
  disabled?: boolean;
}

// Hand-rolled — no segmented-OTP-input library exists in the repo. Digit order
// always stays left-to-right regardless of app language: RTL only mirrors
// surrounding layout (back button, text alignment), never the numeral sequence
// itself, so this component intentionally ignores useRTL().
export function OtpCodeInput({ value, onChange, onComplete, error, disabled }: Props) {
  const { colors } = useAppTheme();
  const inputs = useRef<(TextInput | null)[]>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? '');

  const setDigitAt = (index: number, text: string) => {
    const cleaned = text.replace(/\D/g, '');

    if (!cleaned) {
      const next = digits.slice();
      next[index] = '';
      onChange(next.join(''));
      return;
    }

    if (cleaned.length > 1) {
      // A full (or partial) code was pasted into one box — distribute it
      // across the remaining boxes starting here.
      const next = digits.slice();
      let cursor = index;
      for (const ch of cleaned) {
        if (cursor >= LENGTH) break;
        next[cursor] = ch;
        cursor += 1;
      }
      const joined = next.join('');
      onChange(joined);
      inputs.current[Math.min(cursor, LENGTH - 1)]?.focus();
      if (joined.length === LENGTH) onComplete?.(joined);
      return;
    }

    const next = digits.slice();
    next[index] = cleaned;
    const joined = next.join('');
    onChange(joined);

    if (index < LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
    if (joined.length === LENGTH) {
      onComplete?.(joined);
    }
  };

  const handleKeyPress = (index: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.row}>
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            inputs.current[index] = ref;
          }}
          value={digit}
          onChangeText={(text) => setDigitAt(index, text)}
          onKeyPress={(e) => handleKeyPress(index, e)}
          keyboardType="number-pad"
          maxLength={LENGTH}
          editable={!disabled}
          selectTextOnFocus
          textAlign="center"
          style={[
            styles.box,
            {
              borderColor: error ? colors.error : digit ? colors.primary : colors.gray200,
              backgroundColor: colors.gray50,
              color: colors.black,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  box: {
    width: 46,
    height: 56,
    borderWidth: 1.5,
    borderRadius: Theme.input.borderRadius,
    fontSize: 22,
    fontWeight: '700',
  },
});
