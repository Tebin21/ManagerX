import React from 'react';
import { View, Image, StyleSheet, StatusBar } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/colors';

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const handleNext = () => router.replace('/(onboarding)/language');

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <GradientBackground>
        <View style={styles.content}>
          <MotiView
            from={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 100, delay: 200 }}
            style={styles.logoBlock}
          >
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', damping: 18, stiffness: 120, delay: 400 }}
              style={styles.logoWrapper}
            >
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </MotiView>
            <Text style={styles.appName}>{t('common.appName')}</Text>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 24 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 100, delay: 600 }}
            style={styles.cardWrap}
          >
            <PremiumCard style={styles.card}>
              <Text style={[styles.headline, { color: colors.darkBlue }]}>
                {t('welcome.headline')}
              </Text>
              <Text style={styles.tagline}>{t('welcome.tagline')}</Text>

              <View style={styles.buttonRow}>
                <PrimaryButton label={t('common.next')} onPress={handleNext} />
              </View>
            </PremiumCard>
          </MotiView>
        </View>
      </GradientBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  logoBlock: {
    alignItems: 'center',
  },
  logoWrapper: {
    width: 130,
    height: 130,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  logo: {
    width: 100,
    height: 100,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cardWrap: {
    width: '100%',
  },
  card: {
    alignItems: 'center',
  },
  headline: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: Colors.gray500,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    width: '100%',
  },
});
