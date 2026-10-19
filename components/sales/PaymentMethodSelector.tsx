import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import type { PaymentMethod } from '@/types/sales';

interface Option {
  method: PaymentMethod;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface Props {
  selected: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

export function PaymentMethodSelector({ selected, onChange }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { flexDirection } = useRTL();
  const { isTablet, isTabletLandscape } = useResponsive();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');

  const options: Option[] = useMemo(
    () => [
      {
        method: 'cash',
        label: isKuLanguage ? 'کاش' : t('sales.cash', 'Cash'),
        icon: 'cash-outline',
      },
      {
        method: 'fib',
        label: 'FIB',
        icon: 'phone-portrait-outline',
      },
      {
        method: 'debt',
        label: isKuLanguage ? 'قەرز' : t('sales.debt', 'Debt'),
        icon: 'time-outline',
      },
    ],
    [isKuLanguage, t]
  );

  return (
    <View style={[styles.row, { flexDirection }]}>
      {options.map((opt) => {
        const active = selected === opt.method;
        return (
          <TouchableOpacity
            key={opt.method}
            onPress={() => onChange(opt.method)}
            activeOpacity={0.8}
            style={[
              styles.option,
              isTablet && {
                paddingVertical: isTabletLandscape ? 24 : 20,
                borderRadius: isTabletLandscape ? 18 : 16,
              },
              active
                ? { borderColor: colors.primary, backgroundColor: colors.softBlue }
                : { borderColor: colors.gray200, backgroundColor: colors.gray50 },
            ]}
          >
            <Ionicons
              name={opt.icon}
              size={isTabletLandscape ? 30 : (isTablet ? 26 : 20)}
              color={active ? colors.primary : colors.gray400}
            />
            <Text
              style={[
                styles.label,
                isTablet && { fontSize: isTabletLandscape ? 17 : 16 },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                { color: active ? colors.primary : colors.gray500 },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row:    { flexDirection: 'row', gap: 8 },
  option: {
    flex:           1,
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            4,
    paddingVertical: 12,
    borderRadius:   12,
    borderWidth:    2,
  },
  label: { fontSize: 13, fontWeight: '600' },
});
