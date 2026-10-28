import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/settings/SettingsText';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { SettingsBackground } from '@/components/settings/SettingsBackground';
import { SettingSection } from '@/components/settings/SettingSection';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { useLanguageStore } from '@/store/languageStore';
import { useSettingsStore } from '@/store/settingsStore';
import { SETTINGS_KURDISH_FONT_BOLD, SETTINGS_KURDISH_FONT } from '@/lib/settingsFont';
import { hexToRgba } from '@/lib/colorUtils';
import { APP_SCALE_LEVELS, getScaleInfo, DEFAULT_SCALE_LEVEL } from '@/constants/scale';

export default function UiScaleScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { isTablet, contentContainerStyle } = useResponsive();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  const currentSavedLevel = useSettingsStore((s) => s.appScaleLevel ?? DEFAULT_SCALE_LEVEL);
  const setAppScaleLevel = useSettingsStore((s) => s.setAppScaleLevel);

  // Staged level before tapping "Save"
  const [selectedLevel, setSelectedLevel] = useState<number>(currentSavedLevel);

  const selectedInfo = getScaleInfo(selectedLevel);
  const previewFactor = selectedInfo.factor;

  const handleLevelSelect = (level: number) => {
    try {
      Haptics.selectionAsync().catch(() => {});
    } catch {}
    setSelectedLevel(level);
  };

  const handleDecrement = () => {
    if (selectedLevel > 1) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      } catch {}
      setSelectedLevel((prev) => Math.max(1, prev - 1));
    }
  };

  const handleIncrement = () => {
    if (selectedLevel < 10) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      } catch {}
      setSelectedLevel((prev) => Math.min(10, prev + 1));
    }
  };

  const handleSaveAndApply = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {}

    setAppScaleLevel(selectedLevel);

    Alert.alert(
      isKurdish ? 'سەرکەوتوو بوو' : 'Saved Successfully',
      isKurdish
        ? `قەبارەی گشتی بەرنامە گۆڕدرا بۆ ${selectedInfo.labelKu} (${selectedInfo.percent}٪) و بە سەرکەوتوویی جێبەجێ کرا.`
        : `App UI scale set to ${selectedInfo.labelEn} (${selectedInfo.percent}%) and applied globally.`,
      [
        {
          text: isKurdish ? 'باشە' : 'OK',
          onPress: () => router.back(),
        },
      ]
    );
  };

  const handleReset = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {}
    setSelectedLevel(DEFAULT_SCALE_LEVEL);
  };

  const hasChanges = selectedLevel !== currentSavedLevel;

  return (
    <View style={styles.screen}>
      <SettingsBackground />
      <SettingsHeader
        title={isKurdish ? 'قەبارە و پێوەری گشتی بەرنامە' : 'App UI Display Scale'}
      />

      <ScrollView
        contentContainerStyle={[styles.body, isTablet && contentContainerStyle]}
        showsVerticalScrollIndicator={false}
      >
        {/* Live Visual Preview Box */}
        <SettingSection
          title={isKurdish ? 'پێشبینینی ڕاستەوخۆ بەپێی قەبارەی هەڵبژێردراو' : 'Live Interactive Scale Preview'}
        >
          <View
            style={[
              styles.previewContainer,
              {
                backgroundColor: isDark ? '#1E293B' : colors.white,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
              },
            ]}
          >
            {/* Header of preview box */}
            <View style={[styles.previewHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.previewBadge, { backgroundColor: hexToRgba(colors.primary, 0.15), borderColor: hexToRgba(colors.primary, 0.3) }]}>
                <Ionicons name="expand-outline" size={14} color={colors.primary} />
                <Text
                  style={[
                    styles.previewBadgeText,
                    { color: colors.primary },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKurdish ? `ئاستی ${selectedLevel} • ${selectedInfo.percent}٪` : `Level ${selectedLevel} • ${selectedInfo.percent}%`}
                </Text>
              </View>
              <Text
                style={[
                  styles.previewTitle,
                  { color: isDark ? colors.gray300 : colors.gray600 },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {isKurdish ? selectedInfo.labelKu : selectedInfo.labelEn}
              </Text>
            </View>

            {/* Simulated Live Components at this exact scale */}
            <View style={styles.simulatedArea}>
              {/* 1. Category / Card Mock */}
              <View
                style={[
                  styles.mockCard,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                    padding: Math.round(12 * previewFactor),
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <View
                  style={[
                    styles.mockIconSquircle,
                    {
                      width: Math.round(44 * previewFactor),
                      height: Math.round(44 * previewFactor),
                      borderRadius: Math.round(12 * previewFactor),
                      backgroundColor: hexToRgba(colors.primary, 0.16),
                    },
                  ]}
                >
                  <Ionicons
                    name="storefront-outline"
                    size={Math.round(22 * previewFactor)}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1, marginHorizontal: Math.round(10 * previewFactor) }}>
                  <Text
                    style={[
                      {
                        fontSize: Math.round(14.5 * previewFactor),
                        fontWeight: '700',
                        color: colors.black,
                        textAlign,
                      },
                      isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isKurdish ? 'فرۆشتنی نوێ و پسوولە' : 'New Sale & Invoice'}
                  </Text>
                  <Text
                    style={[
                      {
                        fontSize: Math.round(11.5 * previewFactor),
                        color: colors.gray400,
                        marginTop: 2,
                        textAlign,
                      },
                      isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
                    ]}
                  >
                    {isKurdish ? 'نموونەی تێکستی کارت و بەشەکان' : 'Card item description preview'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.mockStatusChip,
                    {
                      paddingHorizontal: Math.round(8 * previewFactor),
                      paddingVertical: Math.round(3 * previewFactor),
                      borderRadius: 999,
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5',
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: Math.round(11 * previewFactor),
                      fontWeight: '700',
                      color: '#059669',
                    }}
                  >
                    $24.50
                  </Text>
                </View>
              </View>

              {/* 2. Primary Button Mock */}
              <View
                style={[
                  styles.mockButton,
                  {
                    height: Math.round(48 * previewFactor),
                    borderRadius: Math.round(12 * previewFactor),
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={Math.round(18 * previewFactor)}
                  color="#FFFFFF"
                  style={{ marginEnd: 6 }}
                />
                <Text
                  style={[
                    {
                      fontSize: Math.round(14 * previewFactor),
                      color: '#FFFFFF',
                      fontWeight: '700',
                    },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKurdish ? 'نموونەی دوگمەی گشتی بەرنامە' : 'Primary Button Sample'}
                </Text>
              </View>
            </View>
          </View>
        </SettingSection>

        {/* Stepper with [-] and [+] Buttons & Step Indicators */}
        <SettingSection
          title={isKurdish ? 'دەستکاری ئاستی قەبارە (١ تا ١٠ ئاست)' : 'Scale Controller (1 to 10 Levels)'}
        >
          <View
            style={[
              styles.stepperContainer,
              {
                backgroundColor: isDark ? '#1E293B' : colors.white,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
              },
            ]}
          >
            {/* Counter Row */}
            <View style={[styles.counterRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {/* Minus button */}
              <TouchableOpacity
                onPress={handleDecrement}
                disabled={selectedLevel <= 1}
                style={[
                  styles.stepBtn,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                    opacity: selectedLevel <= 1 ? 0.4 : 1,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={24} color={selectedLevel <= 1 ? colors.gray400 : colors.primary} />
              </TouchableOpacity>

              {/* Central Level Display */}
              <View style={styles.levelDisplayBox}>
                <Text
                  style={[
                    styles.levelLargeNumber,
                    { color: colors.primary },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKurdish ? `ئاستی ${selectedLevel}` : `Level ${selectedLevel}`}
                </Text>
                <Text
                  style={[
                    styles.levelPercentText,
                    { color: colors.black },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {selectedInfo.percent}%
                </Text>
                <Text
                  style={[
                    styles.levelSubtitle,
                    { color: colors.gray400 },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
                  ]}
                >
                  {isKurdish ? selectedInfo.subKu : selectedInfo.subEn}
                </Text>
              </View>

              {/* Plus button */}
              <TouchableOpacity
                onPress={handleIncrement}
                disabled={selectedLevel >= 10}
                style={[
                  styles.stepBtn,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                    opacity: selectedLevel >= 10 ? 0.4 : 1,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={24} color={selectedLevel >= 10 ? colors.gray400 : colors.primary} />
              </TouchableOpacity>
            </View>

            {/* 10 Visual Step Bars */}
            <View style={[styles.stepBarsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {APP_SCALE_LEVELS.map((item) => {
                const isActive = item.level === selectedLevel;
                const isPassed = item.level <= selectedLevel;
                return (
                  <TouchableOpacity
                    key={item.level}
                    onPress={() => handleLevelSelect(item.level)}
                    activeOpacity={0.8}
                    style={styles.stepBarTouch}
                  >
                    <View
                      style={[
                        styles.stepBar,
                        {
                          backgroundColor: isActive
                            ? colors.primary
                            : isPassed
                            ? hexToRgba(colors.primary, 0.45)
                            : isDark
                            ? 'rgba(255, 255, 255, 0.1)'
                            : '#E2E8F0',
                          height: isActive ? 12 : 7,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.stepNumberLabel,
                        {
                          color: isActive
                            ? colors.primary
                            : isDark
                            ? colors.gray400
                            : colors.gray500,
                          fontWeight: isActive ? '800' : '500',
                        },
                      ]}
                    >
                      {item.level}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </SettingSection>

        {/* 10 Selectable Scale Level Cards */}
        <SettingSection
          title={isKurdish ? 'هەڵبژاردنی ڕاستەوخۆ لە ١٠ قەبارەکە' : 'Choose Directly From 10 Scale Levels'}
        >
          <View style={styles.levelsList}>
            {APP_SCALE_LEVELS.map((item) => {
              const isSelected = item.level === selectedLevel;
              const isDefault = item.level === DEFAULT_SCALE_LEVEL;
              return (
                <TouchableOpacity
                  key={item.level}
                  onPress={() => handleLevelSelect(item.level)}
                  activeOpacity={0.75}
                  style={[
                    styles.levelCard,
                    {
                      backgroundColor: isSelected
                        ? (isDark ? 'rgba(212, 175, 55, 0.15)' : '#FFFBEB')
                        : isDark
                        ? '#1E293B'
                        : colors.white,
                      borderColor: isSelected
                        ? colors.primary
                        : isDark
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(0, 0, 0, 0.08)',
                      borderWidth: isSelected ? 2 : 1,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  {/* Left (RTL Right): Level Badge */}
                  <View
                    style={[
                      styles.levelBadgeCircle,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : isDark
                          ? 'rgba(255, 255, 255, 0.08)'
                          : '#F1F5F9',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.levelBadgeText,
                        { color: isSelected ? '#FFFFFF' : (isDark ? colors.gray300 : colors.gray700) },
                      ]}
                    >
                      {item.level}
                    </Text>
                  </View>

                  {/* Middle: Title & Subtitle */}
                  <View style={{ flex: 1, marginHorizontal: 12, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={[
                          styles.levelCardTitle,
                          { color: isSelected ? (isDark ? '#FBBF24' : '#B45309') : colors.black, textAlign },
                          isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        ]}
                      >
                        {isKurdish ? item.labelKu : item.labelEn}
                      </Text>
                      {isDefault && (
                        <View style={styles.defaultPill}>
                          <Text style={styles.defaultPillText}>
                            {isKurdish ? 'بنەڕەتی' : 'Default'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.levelCardSub,
                        { color: colors.gray400, textAlign },
                        isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
                      ]}
                    >
                      {isKurdish ? item.subKu : item.subEn}
                    </Text>
                  </View>

                  {/* Right: Percent & Radio Check */}
                  <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 4 }}>
                    <Text
                      style={[
                        styles.levelPercentBadge,
                        { color: isSelected ? colors.primary : colors.gray500 },
                      ]}
                    >
                      {item.percent}%
                    </Text>
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={isSelected ? colors.primary : colors.gray300}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </SettingSection>

        {/* Action Buttons: Save & Apply / Reset */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            onPress={handleSaveAndApply}
            style={[
              styles.saveBtn,
              {
                backgroundColor: colors.primary,
                opacity: hasChanges ? 1 : 0.85,
              },
            ]}
            activeOpacity={0.85}
          >
            <Ionicons name="sparkles" size={18} color="#FFFFFF" style={{ marginEnd: 8 }} />
            <Text
              style={[
                styles.saveBtnText,
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isKurdish
                ? `سەیڤکردن و جێبەجێکردنی قەبارەی ${selectedInfo.percent}٪`
                : `Save & Apply ${selectedInfo.percent}% Scale Globally`}
            </Text>
          </TouchableOpacity>

          {selectedLevel !== DEFAULT_SCALE_LEVEL && (
            <TouchableOpacity
              onPress={handleReset}
              style={[
                styles.resetBtn,
                { borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1' },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={16} color={colors.gray500} style={{ marginEnd: 6 }} />
              <Text
                style={[
                  styles.resetBtnText,
                  { color: isDark ? colors.gray300 : colors.gray600 },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {isKurdish ? 'گەڕاندنەوە بۆ قەبارەی بنەڕەتی (ئاستی ٥ - ١٠٠٪)' : 'Reset to Default Scale (Level 5 - 100%)'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  body: {
    padding: 16,
    paddingBottom: 60,
  },
  previewContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  previewHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  previewBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  previewTitle: {
    fontSize: 13,
  },
  simulatedArea: {
    gap: 10,
  },
  mockCard: {
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  mockIconSquircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockStatusChip: {
    alignSelf: 'center',
  },
  mockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  stepperContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
  },
  counterRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelDisplayBox: {
    alignItems: 'center',
  },
  levelLargeNumber: {
    fontSize: 18,
    fontWeight: '800',
  },
  levelPercentText: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 2,
  },
  levelSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  stepBarsRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    paddingTop: 8,
  },
  stepBarTouch: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  stepBar: {
    width: '100%',
    borderRadius: 4,
    marginBottom: 4,
  },
  stepNumberLabel: {
    fontSize: 10,
  },
  levelsList: {
    gap: 8,
  },
  levelCard: {
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  levelBadgeCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  levelCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  levelCardSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  levelPercentBadge: {
    fontSize: 13,
    fontWeight: '700',
  },
  defaultPill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  defaultPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  actionSection: {
    marginTop: 18,
    gap: 10,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 13,
  },
});

