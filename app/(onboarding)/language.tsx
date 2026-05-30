import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { SupportFooter } from '@/components/ui/SupportFooter';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useLanguageStore } from '@/store/languageStore';
import i18n from '@/lib/i18n';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';

type Lang = 'en' | 'ku';

const LANGUAGES: { id: Lang; native: string; english: string; flag: string; rtl: boolean }[] = [
  { id: 'en', native: 'English', english: 'English', flag: '🇬🇧', rtl: false },
  { id: 'ku', native: 'کوردی', english: 'Kurdish', flag: '🏔️', rtl: true },
];

export default function LanguageScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { setLanguage } = useLanguageStore();
  const [selected, setSelected] = useState<Lang | null>(null);

  const handleConfirm = async () => {
    if (!selected) return;
    setLanguage(selected);
    await i18n.changeLanguage(selected);
    router.replace('/(onboarding)/setup');
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <MotiView
          from={{ opacity: 0, translateY: -10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, delay: 100 }}
        >
          <Text style={styles.headerTitle}>{t('language.title')}</Text>
          <Text style={styles.headerSub}>{t('language.subtitle')}</Text>
        </MotiView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {LANGUAGES.map((lang, index) => {
          const isSelected = selected === lang.id;
          return (
            <TouchableOpacity
              key={lang.id}
              onPress={() => setSelected(lang.id)}
              activeOpacity={0.85}
            >
              <MotiView
                from={{ opacity: 0, translateX: index % 2 === 0 ? -20 : 20 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: 'spring', damping: 18, stiffness: 120, delay: 200 + index * 100 }}
              >
                <MotiView
                  animate={{
                    borderColor: isSelected ? Colors.primary : Colors.gray200,
                    backgroundColor: isSelected ? Colors.softBlue : '#FFFFFF',
                    scale: isSelected ? 1.01 : 1,
                  }}
                  transition={{ type: 'spring', damping: 18, stiffness: 200 }}
                  style={styles.card}
                >
                  <Text style={styles.flag}>{lang.flag}</Text>
                  <View style={styles.cardText}>
                    <Text style={[styles.nativeName, isSelected && styles.selectedText]}>
                      {lang.native}
                    </Text>
                    <Text style={styles.englishName}>{lang.english}</Text>
                    {lang.rtl && (
                      <View style={styles.rtlTag}>
                        <Text style={styles.rtlTagText}>{t('settings.languageScreen.rtlNote')}</Text>
                      </View>
                    )}
                  </View>
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                  )}
                </MotiView>
              </MotiView>
            </TouchableOpacity>
          );
        })}

        <View style={styles.buttonRow}>
          <PrimaryButton
            label={t('language.confirmBtn')}
            onPress={handleConfirm}
            disabled={!selected}
          />
        </View>

        <SupportFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.gray50 },
  header: {
    paddingTop: 60,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  headerSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  scroll: {
    padding: 20,
    gap: 14,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.radius.card,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.gray200,
    ...Theme.shadow.card,
    gap: 16,
  },
  flag: {
    fontSize: 40,
  },
  cardText: {
    flex: 1,
    gap: 3,
  },
  nativeName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.darkBlue,
  },
  selectedText: {
    color: Colors.primary,
  },
  englishName: {
    fontSize: 13,
    color: Colors.gray500,
  },
  rtlTag: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.lightBlue,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
  },
  rtlTagText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonRow: {
    marginTop: 12,
  },
});
