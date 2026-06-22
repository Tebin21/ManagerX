import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { SettingsHeader as AppHeader } from '@/components/settings/SettingsHeader';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useLanguageStore } from '@/store/languageStore';
import { useRTL, RTL_SPACING } from '@/lib/rtl';

type Lang = 'en' | 'ku';

const LANGUAGES: { code: Lang; label: string; native: string; flag: string; rtl: boolean }[] = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧', rtl: false },
  { code: 'ku', label: 'Kurdish', native: 'کوردی',   flag: '🇮🇶', rtl: true  },
];

export default function LanguageScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { language, setLanguage } = useLanguageStore();
  const { isRTL, flexDirection } = useRTL();

  function handleSelect(code: Lang) {
    if (code === language) return;
    setLanguage(code);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={t('settings.languageScreen.title')} showBack />

      <View style={styles.body}>
        <Text style={[styles.hint, { color: colors.gray400 }]}>
          {t('settings.languageScreen.hint')}
        </Text>

        <View style={[styles.card, { backgroundColor: colors.white }]}>
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
                  !isLast && { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
                  { flexDirection, paddingVertical: isRTL ? RTL_SPACING.rowPadV + 2 : 14, gap: isRTL ? RTL_SPACING.gapLg : 12 },
                ]}
              >
                <View style={styles.labelWrap}>
                  <Text style={[styles.labelMain, { color: colors.black }]}>{lang.label}</Text>
                  <Text style={[styles.labelNative, { color: colors.gray400, marginTop: isRTL ? RTL_SPACING.title : 1 }]}>{lang.native}</Text>
                </View>

                {isActive ? (
                  <View style={[styles.check, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                ) : (
                  <View style={[styles.checkEmpty, { borderColor: colors.gray200 }]} />
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
});
