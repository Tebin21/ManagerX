import React from 'react';
import { View, ScrollView, StyleSheet, StatusBar } from 'react-native';
import type { ComponentProps } from 'react';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { useOnboardingStore } from '@/store/onboardingStore';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { MODULES } from '@/constants/config';

export default function AboutScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { completeOnboarding } = useOnboardingStore();
  const { flexDirection, textAlign } = useRTL();

  const features = t('about.features').split('\n').filter(Boolean);

  const handleContinue = () => {
    completeOnboarding();
    router.replace('/(onboarding)/login');
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMid]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <MotiView
          from={{ opacity: 0, translateY: -10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, delay: 100 }}
        >
          <Text style={styles.headerTitle}>{t('about.title')}</Text>
          <Text style={styles.headerSub}>{t('about.subtitle')}</Text>
        </MotiView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 120, delay: 150 }}
        >
          <PremiumCard>
            <Text style={[styles.intro, { textAlign }]}>{t('about.intro')}</Text>
            <View style={styles.featureList}>
              {features.map((line, idx) => (
                <Text key={idx} style={[styles.featureLine, { textAlign }]}>
                  {line}
                </Text>
              ))}
            </View>
          </PremiumCard>
        </MotiView>

        {MODULES.map((module, index) => (
          <MotiView
            key={module.id}
            from={{ opacity: 0, translateX: index % 2 === 0 ? -20 : 20 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 120, delay: 200 + index * 80 }}
          >
            <View style={[styles.moduleCard, { flexDirection }]}>
              <View style={[styles.iconWrapper, { backgroundColor: colors.softBlue }]}>
                <Ionicons
                  name={module.icon as ComponentProps<typeof Ionicons>['name']}
                  size={26}
                  color={colors.primary}
                />
              </View>
              <View style={styles.moduleText}>
                <Text style={[styles.moduleTitle, { color: colors.darkBlue, textAlign }]}>
                  {t(module.labelKey)}
                </Text>
                <Text style={[styles.moduleDescription, { textAlign }]}>
                  {t(module.descriptionKey)}
                </Text>
              </View>
            </View>
          </MotiView>
        ))}

        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 120, delay: 200 + MODULES.length * 80 }}
        >
          <View style={[styles.growthCard, { backgroundColor: colors.softBlue, flexDirection }]}>
            <Ionicons name="trending-up" size={24} color={colors.primary} />
            <Text style={[styles.growthText, { color: colors.darkBlue, textAlign }]}>
              {t('about.growthBenefit')}
            </Text>
          </View>
        </MotiView>

        <View style={styles.buttonRow}>
          <PrimaryButton label={t('common.continue')} onPress={handleContinue} />
        </View>
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
  intro: {
    fontSize: 14,
    color: Colors.gray600,
    lineHeight: 21,
    marginBottom: 14,
  },
  featureList: {
    gap: 6,
  },
  featureLine: {
    fontSize: 13,
    color: Colors.gray600,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.radius.card,
    padding: 16,
    gap: 14,
    ...Theme.shadow.soft,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleText: {
    flex: 1,
    gap: 2,
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  moduleDescription: {
    fontSize: 12,
    color: Colors.gray500,
  },
  growthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Theme.radius.card,
    padding: 16,
    gap: 12,
  },
  growthText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  buttonRow: {
    marginTop: 4,
  },
});
