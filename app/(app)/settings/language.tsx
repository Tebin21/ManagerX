import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/settings/SettingsText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { SettingsHeader as AppHeader } from '@/components/settings/SettingsHeader';
import { SettingsBackground } from '@/components/settings/SettingsBackground';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useLanguageStore } from '@/store/languageStore';
import { useRTL, RTL_SPACING } from '@/lib/rtl';

type Lang = 'en' | 'ku';

const LANGUAGES: { code: Lang; label: string; native: string; flag: string; rtl: boolean }[] = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧', rtl: false },
  { code: 'ku', label: 'Kurdish', native: 'کوردی',   flag: '🇮🇶', rtl: true  },
];

const IS_IOS = Platform.OS === 'ios';

export default function LanguageScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { language, setLanguage } = useLanguageStore();
  const { isRTL, flexDirection, textAlign, writingDirection } = useRTL();

  function handleSelect(code: Lang) {
    if (code === language) return;
    setLanguage(code);
  }

  const cardStyle = IS_IOS
    ? [
        styles.glassCard,
        {
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.68)' : 'rgba(255, 255, 255, 0.72)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.85)',
          shadowColor: isDark ? '#000000' : '#0F172A',
        },
      ]
    : [
        styles.card,
        {
          backgroundColor: colors.white,
        },
      ];

  const dividerColor = IS_IOS
    ? (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)')
    : colors.gray100;

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <SettingsBackground />
      <AppHeader title={t('settings.languageScreen.title')} showBack />

      <View style={styles.body}>
        <Text style={[styles.hint, { color: colors.gray400, textAlign, writingDirection }]}>
          {t('settings.languageScreen.hint')}
        </Text>

        <View style={cardStyle}>
          {IS_IOS && (
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.01)', 'rgba(255, 255, 255, 0.04)']
                  : ['rgba(255, 255, 255, 0.60)', 'rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.22)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
              pointerEvents="none"
            />
          )}

          {LANGUAGES.map((lang, i) => {
            const isActive = language === lang.code;
            const isLast   = i === LANGUAGES.length - 1;
            return (
              <TouchableOpacity
                key={lang.code}
                onPress={() => handleSelect(lang.code)}
                activeOpacity={0.7}
                style={[
                  styles.row,
                  !isLast && { borderBottomWidth: 1, borderBottomColor: dividerColor },
                  { flexDirection, paddingVertical: isRTL ? RTL_SPACING.rowPadV + 2 : 14, gap: isRTL ? RTL_SPACING.gapLg : 12 },
                ]}
              >
                <View style={styles.labelWrap}>
                  <Text style={[styles.labelMain, { color: colors.black, textAlign, writingDirection }]}>{lang.label}</Text>
                  <Text style={[styles.labelNative, { color: colors.gray400, marginTop: isRTL ? RTL_SPACING.title : 1, textAlign, writingDirection }]}>{lang.native}</Text>
                </View>

                {isActive ? (
                  <View style={[styles.check, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                ) : (
                  <View style={[styles.checkEmpty, { borderColor: isDark ? colors.gray300 : colors.gray200 }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body:      { padding: 16, paddingTop: 12 },

  hint: {
    fontSize:     12,
    lineHeight:   17,
    marginBottom: 16,
    paddingHorizontal: 4,
  },

  card: {
    borderRadius:  16,
    overflow:      'hidden',
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius:  4,
    elevation:     2,
  },

  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 16,
    gap:               12,
  },

  labelWrap:   { flex: 1 },
  labelMain:   { fontSize: 16, fontWeight: '600' },
  labelNative: { fontSize: 13 },

  check: {
    width:          26,
    height:         26,
    borderRadius:   13,
    alignItems:     'center',
    justifyContent: 'center',
  },
  checkEmpty: {
    width:        26,
    height:       26,
    borderRadius: 13,
    borderWidth:  2,
  },
  glassCard: {
    borderRadius:  20,
    borderWidth:   1.2,
    overflow:      'hidden',
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius:  16,
  },
  ambientOrbTop: {
    position:     'absolute',
    top:          50,
    left:         -50,
    width:        320,
    height:       320,
    borderRadius: 160,
  },
  ambientOrbMid: {
    position:     'absolute',
    top:          250,
    right:        -40,
    width:        300,
    height:       300,
    borderRadius: 150,
  },
});
