import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/constants/theme';
import { useRTL, useDirectionalChevron } from '@/lib/rtl';

export function TutorialsCard() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { textAlign, flexDirection } = useRTL();
  const { chevronForward } = useDirectionalChevron();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push('/(app)/settings/tutorials' as never)}
    >
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.circleLg} />
        <View style={styles.circleSm} />

        <View style={[styles.row, { flexDirection }]}>
          <View style={styles.iconWrap}>
            <Ionicons name="play-circle" size={26} color="#fff" />
          </View>
          <View style={styles.content}>
            <Text style={[styles.title, { textAlign }]}>{t('settings.tutorials')}</Text>
            <Text style={[styles.sub, { textAlign }]}>{t('settings.tutorialsSub')}</Text>
          </View>
          <Ionicons name={chevronForward as never} size={18} color="rgba(255,255,255,0.85)" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Theme.radius.card,
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
  },
  circleLg: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -40,
    right: -30,
  },
  circleSm: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -24,
    left: -16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: '#fff' },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
});
