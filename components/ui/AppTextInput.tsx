import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TextInputProps, TextStyle, Platform } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { MotiView } from 'moti';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont, resolveInputIsKurdish } from '@/lib/settingsFont';
import { Theme } from '@/constants/theme';
import { useKeyboardAwareFocus } from '@/components/common/KeyboardAwareScrollView';
import { useResponsive } from '@/hooks/useResponsive';
import { toEnglishDigits, sanitizeNumericInput } from '@/utils/formatters';
import { AuthInputContext, getAuthScreenActive } from '@/lib/autoEnglishDigits';
interface Props extends TextInputProps {
  label?: string;
  error?: string;
  rightElement?: React.ReactNode;
  /** Merged onto the label's default style — undefined leaves it unchanged */
  labelStyle?: TextStyle;
  /** Merged onto the error text's default style — undefined leaves it unchanged */
  errorStyle?: TextStyle;
  /**
   * Renders the placeholder (only) in the Kurdish typeface (Rudaw), even on
   * numeric-keyboard fields that otherwise skip it — for placeholders that
   * mix Kurdish words with Kurdish digits (e.g. phone-number examples). The
   * typed value keeps rendering in its normal font; this only swaps the
   * empty-state placeholder's font and is a no-op outside the Kurdish
   * language.
   */
  kurdishPlaceholderFont?: boolean;
  /**
   * For alphanumeric codes/IDs/serials the user may type with a full
   * keyboard (so a numeric `keyboardType` isn't an option) — e.g. a shared
   * item ID like "SN-12345". Skips the Kurdish typeface entirely (not just
   * incidentally, like numeric-keyboard fields) and forces LTR alignment,
   * so mixed letters+digits never render in Rudaw or get right-aligned.
   */
  forceLatin?: boolean;
}

export function AppTextInput({ label, error, style, rightElement, labelStyle, errorStyle, kurdishPlaceholderFont, forceLatin, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const inputRef = React.useRef<TextInput>(null);
  const { colors } = useAppTheme();
  const { isTablet, inputHeight, uiScaleFactor } = useResponsive();
  const { textAlign } = useRTL();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku' || s.language === 'ar');
  // A single TextInput can't mix fonts per-character the way AppText can for
  // display text, so a value-aware decision picks ONE font for the whole
  // field: numeric-keyboard/forceLatin fields always skip the Kurdish font,
  // and any non-empty value containing zero Kurdish-script characters (a
  // typed barcode/SKU/email) also renders in Latin, even though the app
  // language is Kurdish — this is what makes e.g. "Hshs28373" render in one
  // consistent font instead of the Kurdish typeface's inconsistent Latin
  // glyph coverage. A value that mixes Kurdish words with an embedded Latin
  // substring still renders the whole field in Rudaw — a single native
  // TextInput can't render two fonts within one string, so that case is an
  // unavoidable limitation, not a regression.
  const isKurdish = resolveInputIsKurdish({
    isKuLanguage,
    value: typeof rest.value === 'string' ? rest.value : undefined,
    placeholder: typeof rest.placeholder === 'string' ? rest.placeholder : undefined,
    keyboardType: rest.keyboardType,
    forceLatin,
  });
  let isAuth = getAuthScreenActive();
  try {
    const ctxAuth = React.useContext(AuthInputContext);
    if (ctxAuth) isAuth = true;
  } catch {}
  const skipConversion =
    isAuth ||
    rest.secureTextEntry ||
    (rest as any).skipEnglishDigitsConversion ||
    rest.textContentType === 'password' ||
    rest.textContentType === 'newPassword';

  const origOnChangeText = rest.onChangeText;
  const handleChangeText = origOnChangeText
    ? (text: string) => {
        const converted = skipConversion
          ? text
          : sanitizeNumericInput(text, rest.keyboardType, rest.inputMode);
        if (inputRef.current && converted === rest.value && text !== rest.value) {
          try {
            (inputRef.current as any)?.setNativeProps?.({ text: converted });
          } catch {}
        }
        origOnChangeText(converted);
      }
    : undefined;

  const valueToUse =
    typeof rest.value === 'string' && !skipConversion
      ? sanitizeNumericInput(rest.value, rest.keyboardType, rest.inputMode)
      : rest.value;

  const scrollIntoView = useKeyboardAwareFocus();
  const showKuPlaceholderOverlay = !!kurdishPlaceholderFont && isKuLanguage && !rest.value;
  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.gray600, textAlign, fontSize: Math.round((isTablet ? 15 : 13) * uiScaleFactor * 10) / 10 }, labelStyle]}>{label}</Text>
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
            minHeight: inputHeight,
            borderRadius: Math.round((isTablet ? 16 : 12) * uiScaleFactor),
            borderColor:     colors.gray200,
            backgroundColor: colors.gray50,
            shadowColor:     colors.primary,
          },
        ]}
      >
        <View style={styles.inputRow}>
          <View style={styles.inputBox}>
            <TextInput
              {...rest}
              ref={(node) => {
                (inputRef as any).current = node;
                const externalRef = (rest as any).ref;
                if (typeof externalRef === 'function') externalRef(node);
                else if (externalRef && typeof externalRef === 'object') (externalRef as any).current = node;
              }}
              value={valueToUse}
              onChangeText={handleChangeText}
              placeholder={showKuPlaceholderOverlay ? undefined : rest.placeholder}
              style={applyKurdishFont(isKurdish, [
                styles.input,
                {
                  height: inputHeight,
                  fontSize: Math.round((isTablet ? 17 : 15) * uiScaleFactor * 10) / 10,
                  flex: 1,
                  color: colors.black,
                  textAlign,
                },
                Platform.OS === 'web' && ({ outlineStyle: 'none', outlineWidth: 0, outline: 'none' } as any),
                forceLatin && { textAlign: 'left', writingDirection: 'ltr' },
                style,
              ] as never)}
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
            {showKuPlaceholderOverlay && (
              <Text pointerEvents="none" style={[styles.kuPlaceholderOverlay, { lineHeight: inputHeight, fontSize: Math.round((isTablet ? 17 : 15) * uiScaleFactor * 10) / 10 }, { textAlign, color: colors.gray400 }]}>
                {rest.placeholder}
              </Text>
            )}
          </View>
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
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0, outline: 'none' } as any) : {}),
  },
  inputBox: {
    flex:     1,
    position: 'relative',
  },
  kuPlaceholderOverlay: {
    position:     'absolute',
    top:          0,
    start:        0,
    end:          0,
    bottom:       0,
    paddingStart: 16,
    fontSize:     15,
    lineHeight:   Theme.input.height,
  },
  error: {
    fontSize:  12,
    marginTop: 4,
  },
});
