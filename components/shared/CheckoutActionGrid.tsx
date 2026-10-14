import React from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import * as Haptics from 'expo-haptics';

export type CheckoutMode = 'normal' | 'print' | 'empty1' | 'empty2';

interface Props {
  mode: CheckoutMode;
  onSelectMode: (mode: CheckoutMode) => void;
  type?: 'sale' | 'purchase';
}

export function CheckoutActionGrid({ mode, onSelectMode, type = 'sale' }: Props) {
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  const isSale = type === 'sale';

  const handlePress = (targetMode: CheckoutMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (targetMode === 'empty1' || targetMode === 'empty2') {
      Alert.alert(
        isKurdish ? 'بەشی بەتاڵ' : 'Empty Slot',
        isKurdish
          ? 'ئەم بەتنە لە ئێستادا بەتاڵە و لە نوێکردنەوەی داهاتوودا دیاری دەکرێت.'
          : 'This button is currently empty and will be configured in a future update.'
      );
      return;
    }
    onSelectMode(targetMode);
  };

  const options: Array<{
    id: CheckoutMode;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    isEmpty?: boolean;
  }> = [
    {
      id: 'normal',
      title: isKurdish ? 'ئاسایی' : 'Normal',
      subtitle: isKurdish
        ? (isSale ? 'فرۆشتن و گەڕانەوە' : 'کڕین و گەڕانەوە')
        : (isSale ? 'Quick Sale' : 'Quick Purchase'),
      icon: 'flash-outline',
    },
    {
      id: 'print',
      title: isKurdish ? 'پرینت' : 'Print',
      subtitle: isKurdish ? 'چاپ و گەڕانەوە' : 'Print & Return',
      icon: 'print-outline',
    },
    {
      id: 'empty1',
      title: isKurdish ? 'بەتاڵ ١' : 'Empty 1',
      subtitle: isKurdish ? 'خاڵی' : 'Empty',
      icon: 'ellipsis-horizontal-circle-outline',
      isEmpty: true,
    },
    {
      id: 'empty2',
      title: isKurdish ? 'بەتاڵ ٢' : 'Empty 2',
      subtitle: isKurdish ? 'خاڵی' : 'Empty',
      icon: 'ellipsis-horizontal-circle-outline',
      isEmpty: true,
    },
  ];

  return (
    <View style={styles.container}>
      {/* Title */}
      <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Ionicons name="options-outline" size={16} color={colors.primary} />
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.black, textAlign },
            isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
          ]}
        >
          {isKurdish
            ? (isSale ? 'شێوازی تەواوکردنی فرۆشتن' : 'شێوازی تەواوکردنی کڕین')
            : (isSale ? 'Sale Completion Mode' : 'Purchase Completion Mode')}
        </Text>
      </View>

      {/* 4 Buttons Grid (2x2) */}
      <View style={[styles.grid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {options.map((opt) => {
          const isSelected = mode === opt.id;
          const isSlotEmpty = Boolean(opt.isEmpty);

          return (
            <TouchableOpacity
              key={opt.id}
              activeOpacity={0.75}
              onPress={() => handlePress(opt.id)}
              style={[
                styles.card,
                {
                  backgroundColor: isSelected
                    ? colors.primary + (isDark ? '22' : '14')
                    : (isDark ? colors.gray100 : colors.white),
                  borderColor: isSelected
                    ? colors.primary
                    : (isSlotEmpty ? colors.gray200 + '80' : colors.gray200),
                  borderStyle: isSlotEmpty ? 'dashed' : 'solid',
                  opacity: isSlotEmpty ? 0.65 : 1,
                },
              ]}
            >
              {/* Selected Badge */}
              {isSelected && (
                <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                </View>
              )}

              <View style={[styles.iconRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: isSelected
                        ? colors.primary + '25'
                        : (isDark ? colors.gray200 : colors.gray100),
                    },
                  ]}
                >
                  <Ionicons
                    name={opt.icon}
                    size={18}
                    color={isSelected ? colors.primary : (isSlotEmpty ? colors.gray400 : colors.gray600)}
                  />
                </View>

                <View style={styles.textCol}>
                  <Text
                    style={[
                      styles.cardTitle,
                      {
                        color: isSelected ? colors.primary : (isSlotEmpty ? colors.gray400 : colors.black),
                        textAlign,
                      },
                      isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                    ]}
                    numberOfLines={1}
                  >
                    {opt.title}
                  </Text>
                  <Text
                    style={[
                      styles.cardSubtitle,
                      { color: isSelected ? colors.primary + 'CC' : colors.gray400, textAlign },
                    ]}
                    numberOfLines={1}
                  >
                    {opt.subtitle}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  headerRow: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  grid: {
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  card: {
    width: '48.5%',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 10,
    minHeight: 64,
    justifyContent: 'center',
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  iconRow: {
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 10,
    fontWeight: '500',
  },
});
