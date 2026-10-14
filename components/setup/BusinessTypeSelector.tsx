import React, { useRef, useEffect } from 'react';
import { ScrollView, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { MotiView } from 'moti';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { BUSINESS_TYPES } from '@/constants/config';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { useTranslation } from 'react-i18next';
import { Theme } from '@/constants/theme';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
}

export function BusinessTypeSelector({ value, onChangeText, error }: Props) {
  const { colors } = useAppTheme();
  const { isRTL, textAlign } = useRTL();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const initialScrollDone = useRef(false);

  useEffect(() => {
    initialScrollDone.current = false;
  }, [isRTL]);

  const getLabel = (bt: { id: string; label: string; labelKu?: string }) => {
    if (isKurdish) return bt.labelKu ?? bt.label;
    return bt.label;
  };

  // If the stored value is a predefined chip id, show the human-readable label in the
  // text input. Free-form typed text is shown as-is.
  const predefined = BUSINESS_TYPES.find((bt) => bt.id === value);
  const displayValue = predefined ? getLabel(predefined) : value;

  const handleContentSizeChange = () => {
    if (isRTL && !initialScrollDone.current) {
      initialScrollDone.current = true;
      scrollRef.current?.scrollToEnd({ animated: false });
    }
  };

  return (
    <View style={styles.wrapper}>
      <AppTextInput
        label={t('setup.businessType')}
        placeholder={t('setup.businessTypePlaceholder')}
        value={displayValue}
        onChangeText={onChangeText}
        error={error}
        autoCorrect={false}
        autoCapitalize="words"
      />

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.chips,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={handleContentSizeChange}
      >
        {BUSINESS_TYPES.map((type) => {
          // Active only when the stored value is this chip's id (set via chip tap).
          // Manually typed text — even if it matches a label — is never considered active.
          const isActive = value === type.id;
          const chipLabel = getLabel(type);

          return (
            <TouchableOpacity
              key={type.id}
              onPress={() => onChangeText(type.id)}
              activeOpacity={0.75}
            >
              <MotiView
                animate={{
                  borderColor: isActive ? colors.primary : colors.gray200,
                  backgroundColor: isActive ? colors.softBlue : colors.gray50,
                  scale: isActive ? 1.02 : 1,
                }}
                transition={{ type: 'spring', damping: 18, stiffness: 200 }}
                style={[styles.chip, { borderColor: colors.gray200 }]}
              >
                <Text style={styles.chipEmoji}>{type.emoji}</Text>
                <Text
                  style={[
                    styles.chipLabel,
                    { color: isActive ? colors.primary : colors.gray600, textAlign },
                    isActive && styles.chipLabelActive,
                    isKurdish && isActive && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {chipLabel}
                </Text>
              </MotiView>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  chips: {
    paddingVertical: 4,
    gap: 8,
  },
  chip: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Theme.radius.lg,
    borderWidth: 1.5,
    minWidth: 86,
    ...Theme.shadow.soft,
  },
  chipEmoji: {
    fontSize: 20,
    marginBottom: 3,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  chipLabelActive: {
    fontWeight: '700',
  },
});
