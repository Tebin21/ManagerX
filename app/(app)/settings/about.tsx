import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/common/AppHeader';
import { SettingSection } from '@/components/settings/SettingSection';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { Colors } from '@/constants/colors';

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors } = useAppTheme();
  const { isRTL } = useRTL();

  return (
    <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <Text style={[styles.infoLabel, { color: colors.gray500 }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.black }]}>{value}</Text>
    </View>
  );
}

export default function AboutScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={t('settings.aboutScreen.title')} showBack />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo block */}
        <View style={styles.logoBlock}>
          <View style={[styles.logoWrap, { backgroundColor: Colors.primary + '15' }]}>
            <Ionicons name="stats-chart" size={40} color={Colors.primary} />
          </View>
          <Text style={[styles.appName, { color: colors.black }]}>ManagerX</Text>
          <Text style={[styles.tagline, { color: colors.gray400 }]}>
            Smart business management
          </Text>
        </View>

        <SettingSection title={t('settings.aboutScreen.appInfo')}>
          <InfoRow label={t('settings.aboutScreen.version')}  value="1.0.0" />
          <InfoRow label={t('settings.aboutScreen.platform')} value="Expo + React Native" />
          <InfoRow label={t('settings.aboutScreen.database')} value="SQLite (offline-first)" />
          <InfoRow label={t('settings.aboutScreen.build')}    value="2026.05" />
        </SettingSection>

        <SettingSection title={t('settings.aboutScreen.developerSection')}>
          <InfoRow
            label={t('settings.aboutScreen.developer')}
            value={t('settings.aboutScreen.developerName')}
          />
          {/* Phone displayed as plain text — no Linking, no dialer, no WhatsApp */}
          <InfoRow
            label={t('settings.aboutScreen.supportPhone')}
            value={t('settings.aboutScreen.phoneNumber')}
          />
        </SettingSection>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  gradHeader: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  scroll:     { flex: 1 },
  body:       { padding: 16, paddingTop: 8 },

  logoBlock: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  logoWrap: {
    width: 80, height: 80, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  appName: { fontSize: 22, fontWeight: '800' },
  tagline: { fontSize: 13 },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600' },
});
