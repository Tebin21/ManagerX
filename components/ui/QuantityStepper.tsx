import React, { useEffect, useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { MotiView } from 'moti';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useTranslation } from 'react-i18next';
import { Theme } from '@/constants/theme';
import { useKeyboardAwareFocus } from '@/components/common/KeyboardAwareScrollView';

interface Props {
  /** Current quantity, as text — same contract as a plain TextInput's `value`. */
  value: string;
  /** Fired on every keystroke AND on +/- presses, exactly like TextInput's onChangeText. */
  onChangeText: (text: string) => void;
  /** Floor for the [-] button. Manual typing is not clamped to this. Default 0. */
  min?: number;
  /** Ceiling for the [+] button. Manual typing is not clamped to this. */
  max?: number;
  step?: number;
  label?: string;
  error?: string;
  /** Locks both buttons and the text field (e.g. a unique-serial item whose qty can't change). */
  disabled?: boolean;
  /** Extra condition (beyond `min`) to disable just the [-] button. */
  decrementDisabled?: boolean;
  /** Extra condition (beyond `max`) to disable just the [+] button. */
  incrementDisabled?: boolean;
  placeholder?: string;
  /** Smaller footprint for tight layouts (e.g. a 3-column item row). Default false. */
  compact?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

function StepButton({
  icon,
  onPress,
  disabled,
  accessibilityLabel,
  compact,
  testID,
}: {
  icon: 'remove' | 'add';
  onPress: () => void;
  disabled: boolean;
  accessibilityLabel: string;
  compact: boolean;
  testID?: string;
}) {
  const { colors } = useAppTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        testID={testID}
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.88, { damping: 15, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
        disabled={disabled}
        activeOpacity={0.7}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        style={[
          compact ? styles.stepBtnCompact : styles.stepBtn,
          { backgroundColor: colors.softBlue },
          disabled && { backgroundColor: colors.gray100 },
        ]}
      >
        <Ionicons name={icon} size={compact ? 14 : 18} color={disabled ? colors.gray300 : colors.primary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Quantity field with integrated [-] / [+] controls around a still-editable
 * text input. Drop-in replacement for a plain numeric TextInput — `value` /
 * `onChangeText` behave identically, so existing form state and validation
 * are untouched; only the buttons are new.
 */
export function QuantityStepper({
  value,
  onChangeText,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  label,
  error,
  disabled = false,
  decrementDisabled = false,
  incrementDisabled = false,
  placeholder,
  compact = false,
  containerStyle,
  testID,
}: Props) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { textAlign, flexDirection } = useRTL();
  const scrollIntoView = useKeyboardAwareFocus();
  const [focused, setFocused] = useState(false);
  // Local buffer so the displayed text always reflects what the user is
  // typing, even if the parent ignores/clamps the value it receives (e.g. a
  // cart store rejecting an out-of-stock quantity) — avoids the input
  // visually snapping back mid-keystroke.
  const [text, setText] = useState(value);

  useEffect(() => {
    if (!focused) setText(value);
  }, [value, focused]);

  function clamp(n: number) {
    return Math.min(max, Math.max(min, n));
  }

  function step1(delta: number) {
    const current = parseInt(text, 10);
    const next = String(clamp((isNaN(current) ? min : current) + delta));
    setText(next);
    onChangeText(next);
  }

  const currentNum = parseInt(text, 10);
  const atMin = !isNaN(currentNum) && currentNum <= min;
  const atMax = !isNaN(currentNum) && currentNum >= max;

  return (
    <View style={containerStyle}>
      {label && (
        <Text style={[styles.label, { color: colors.gray600, textAlign }]}>{label}</Text>
      )}
      <MotiView
        animate={{
          borderColor: error ? colors.error : focused ? colors.primary : colors.gray200,
          shadowOpacity: focused ? 0.12 : 0,
        }}
        transition={{ type: 'timing', duration: 200 }}
        style={[
          compact ? styles.wrapperCompact : styles.wrapper,
          {
            borderColor:     colors.gray200,
            backgroundColor: colors.gray50,
            shadowColor:     colors.primary,
            flexDirection,
          },
          disabled && styles.disabledWrapper,
        ]}
      >
        <StepButton
          testID={testID && `${testID}-decrement`}
          icon="remove"
          onPress={() => step1(-step)}
          disabled={disabled || decrementDisabled || atMin}
          accessibilityLabel={t('common.decreaseQty')}
          compact={compact}
        />
        <TextInput
          testID={testID}
          style={[compact ? styles.inputCompact : styles.input, { color: colors.black }]}
          value={text}
          onChangeText={(t2) => { setText(t2); onChangeText(t2); }}
          onFocus={(e) => { setFocused(true); scrollIntoView(e); }}
          onBlur={() => setFocused(false)}
          keyboardType="number-pad"
          placeholder={placeholder}
          placeholderTextColor={colors.gray400}
          editable={!disabled}
          selectTextOnFocus
        />
        <StepButton
          testID={testID && `${testID}-increment`}
          icon="add"
          onPress={() => step1(step)}
          disabled={disabled || incrementDisabled || atMax}
          accessibilityLabel={t('common.increaseQty')}
          compact={compact}
        />
      </MotiView>
      {error && (
        <Text style={[styles.error, { color: colors.error, textAlign }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize:      13,
    fontWeight:    '500',
    marginBottom:  6,
    letterSpacing: 0.2,
  },
  wrapper: {
    alignItems:        'center',
    borderWidth:        1.5,
    borderRadius:       Theme.input.borderRadius,
    height:             Theme.input.height,
    paddingHorizontal:  6,
    gap:                6,
    shadowOffset:       { width: 0, height: 0 },
    shadowRadius:       6,
    elevation:          0,
  },
  wrapperCompact: {
    alignItems:        'center',
    borderWidth:        1.5,
    borderRadius:       Theme.radius.sm,
    height:             40,
    paddingHorizontal:  3,
    gap:                2,
    shadowOffset:       { width: 0, height: 0 },
    shadowRadius:       6,
    elevation:          0,
  },
  disabledWrapper: { opacity: 0.6 },
  stepBtn: {
    width:          40,
    height:         40,
    borderRadius:   20,
    alignItems:     'center',
    justifyContent: 'center',
  },
  stepBtnCompact: {
    width:          28,
    height:         28,
    borderRadius:   14,
    alignItems:     'center',
    justifyContent: 'center',
  },
  input: {
    flex:       1,
    minWidth:   40,
    height:     '100%',
    fontSize:   17,
    fontWeight: '700',
    textAlign:  'center',
  },
  inputCompact: {
    flex:       1,
    minWidth:   24,
    height:     '100%',
    fontSize:   14,
    fontWeight: '700',
    textAlign:  'center',
    paddingHorizontal: 0,
  },
  error: {
    fontSize:  12,
    marginTop: 4,
  },
});
