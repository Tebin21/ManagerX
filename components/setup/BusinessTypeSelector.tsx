import React from 'react';
import { ScrollView, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { MotiView } from 'moti';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { BUSINESS_TYPES } from '@/constants/config';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useTranslation } from 'react-i18next';
import { Theme } from '@/constants/theme';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
}

export function BusinessTypeSelector({ value, onChangeText, error }: Props) {
  const { colors } = useAppTheme();
  const { textAlign } = useRTL();
  const { t } = useTranslation();

  // If the stored value is a predefined chip id, show the human-readable label in the
  // text input. Free-form typed text is shown as-is.
  const predefined = BUSINESS_TYPES.find((bt) => bt.id === value);
  const displayValue = predefined ? predefined.label : value;

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
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        keyboardShouldPersistTaps="handled"
      >
        {BUSINESS_TYPES.map((type) => {
          // Active only when the stored value is this chip's id (set via chip tap).
          // Manually typed text — even if it matches a label — is never considered active.
          const isActive = value === type.id;
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
                  ]}
                >
                  {type.label}
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
    flexDirection: 'row',
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
