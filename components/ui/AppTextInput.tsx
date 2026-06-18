import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { MotiView } from 'moti';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { Theme } from '@/constants/theme';
interface Props extends TextInputProps {
  label?: string;
  error?: string;
  rightElement?: React.ReactNode;
}

export function AppTextInput({ label, error, style, rightElement, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const { colors } = useAppTheme();
  const { textAlign } = useRTL();
  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.gray600, textAlign }]}>{label}</Text>
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
            style={[styles.input, { flex: 1, color: colors.black, textAlign }, style]}
            placeholderTextColor={colors.gray400}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            {...rest}
          />
          {rightElement}
        </View>
      </MotiView>
      {error && (
        <Text style={[styles.error, { color: colors.error, textAlign }]}>{error}</Text>
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
