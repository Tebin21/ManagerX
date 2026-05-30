import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/common/AppHeader';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useLanguageStore } from '@/store/languageStore';

type Lang = 'en' | 'ku';

const LANGUAGES: { code: Lang; label: string; native: string; flag: string; rtl: boolean }[] = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧', rtl: false },
  { code: 'ku', label: 'Kurdish', native: 'کوردی',   flag: '🇮🇶', rtl: true  },
];

export default function LanguageScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { language, setLanguage } = useLanguageStore();

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
                ]}
              >
                <Text style={styles.flag}>{lang.flag}</Text>
                <View style={styles.labelWrap}>
                  <Text style={[styles.labelMain, { color: colors.black }]}>{lang.label}</Text>
                  <Text style={[styles.labelNative, { color: colors.gray400 }]}>{lang.native}</Text>
                </View>

                {lang.rtl && (
                  <View style={[styles.rtlChip, { backgroundColor: colors.softBlue }]}>
                    <Text style={[styles.rtlText, { color: colors.primary }]}>RTL</Text>
                  </View>
                )}

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
    paddingVertical:   14,
    paddingHorizontal: 16,
    gap:               12,
  },

  flag: { fontSize: 28 },

  labelWrap:   { flex: 1 },
  labelMain:   { fontSize: 16, fontWeight: '600' },
  labelNative: { fontSize: 13, marginTop: 1 },

  rtlChip: {
    borderRadius:      6,
    paddingHorizontal: 8,
    paddingVertical:   3,
  },
  rtlText: { fontSize: 11, fontWeight: '700' },

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
