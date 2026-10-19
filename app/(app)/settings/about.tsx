import React from 'react';
import { View, Image, ScrollView, StyleSheet, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/settings/SettingsText';
import { useTranslation } from 'react-i18next';

import { SettingsHeader as AppHeader } from '@/components/settings/SettingsHeader';
import { SettingSection } from '@/components/settings/SettingSection';
import { SettingsBackground } from '@/components/settings/SettingsBackground';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL, RTL_SPACING } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { withSystemFontLatin } from '@/lib/settingsFont';

// RN's `writingDirection` style is iOS-only (no Android view manager honors
// it), so per-paragraph RTL/LTR correctness can't rely on style props alone —
// it has to be encoded in the text itself via real Unicode bidi controls.
// RLM is a strong, invisible RTL character: prefixing the paragraph with it
// anchors the paragraph's bidi base direction to RTL even when the first
// visible word is a Latin term (e.g. a sentence starting with "BexDre"),
// which is what was pushing the justified last line to align left instead of
// right — this is paragraph-direction handling specific to this screen's
// justified text and stays local. Per-run Latin isolation (font selection +
// LRI/PDI bidi isolates for embedded terms like ERP/POS/API/UI-UX) is
// delegated to the shared `withSystemFontLatin`, the same splitter every
// other Kurdish-mode Text in the app uses, so these terms render in Inter —
// consistent with the rest of the app — instead of a one-off system font.
// English paragraphs are returned untouched.
const RLM = String.fromCharCode(0x200f); // Right-to-Left Mark — invisible, strong RTL

function withBidiLatinTerms(text: string, isRTL: boolean, parentStyle?: TextStyle): React.ReactNode {
  if (!isRTL) return text;
  return withSystemFontLatin(RLM + text, parentStyle);
}

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
  const { colors, isDark } = useAppTheme();
  const { isRTL } = useRTL();
  const { isTablet, contentContainerStyle } = useResponsive();

  const featureList = [
    { icon: 'cart-outline', text: t('settings.aboutScreen.featurePos') },
    { icon: 'cube-outline', text: t('settings.aboutScreen.featureInventory') },
    { icon: 'wallet-outline', text: t('settings.aboutScreen.featureDebts') },
    { icon: 'cash-outline', text: t('settings.aboutScreen.featureCapital') },
    { icon: 'document-text-outline', text: t('settings.aboutScreen.featureReports') },
    { icon: 'globe-outline', text: t('settings.aboutScreen.featureStore') },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <SettingsBackground />
      <AppHeader title={t('settings.aboutScreen.title')} showBack />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.body, isTablet && contentContainerStyle]}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo block with official iPhone App Icon */}
        <View style={styles.logoBlock}>
          <View style={[styles.logoShadow, isTablet && styles.logoShadowTablet]}>
            <View
              style={[
                styles.logoWrap,
                isTablet && styles.logoWrapTablet,
                { borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)' },
              ]}
            >
              <Image
                source={require('@/assets/images/logo-icon.png')}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
          </View>
          <Text style={[styles.appName, isTablet && styles.appNameTablet, { color: colors.black }]}>
            {t('common.appName')}
          </Text>
          <Text style={[styles.tagline, isTablet && styles.taglineTablet, { color: colors.gray400 }]}>
            {t('settings.aboutScreen.tagline')}
          </Text>
        </View>

        {/* About Froshiar Overview Section */}
        <SettingSection title={t('settings.aboutScreen.aboutFroshiar')}>
          <View style={[styles.descBlock, isRTL && styles.descBlockRTL]}>
            <Text style={[styles.descHeading, { color: colors.black, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('common.appName')}
            </Text>
            <Text
              style={[
                styles.descBody,
                {
                  color: colors.gray500,
                  textAlign: 'justify',
                  direction: isRTL ? 'rtl' : 'ltr',
                  writingDirection: isRTL ? 'rtl' : 'ltr',
                },
              ]}
            >
              {withBidiLatinTerms(t('settings.aboutScreen.froshiarOverview'), isRTL, styles.descBody)}
            </Text>

            {/* Feature Highlights Grid */}
            <View style={styles.featuresSection}>
              <Text style={[styles.featuresTitle, isTablet && styles.featuresTitleTablet, { color: colors.black, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('settings.aboutScreen.featuresTitle')}
              </Text>
              <View style={[styles.featuresList, isTablet && styles.featuresListTablet]}>
                {featureList.map((feat, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.featureItem,
                      isTablet && styles.featureItemTablet,
                      {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <View style={[styles.featureIconWrap, { backgroundColor: colors.primary + '18' }]}>
                      <Ionicons name={feat.icon as any} size={18} color={colors.primary} />
                    </View>
                    <Text
                      style={[
                        styles.featureText,
                        {
                          color: colors.gray600,
                          textAlign: isRTL ? 'right' : 'left',
                        },
                      ]}
                    >
                      {feat.text}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </SettingSection>

        {/* App Technical Info */}
        <SettingSection title={t('settings.aboutScreen.appInfo')}>
          <InfoRow label={t('settings.aboutScreen.version')} value="1.0.0" />
          <InfoRow label={t('settings.aboutScreen.build')} value="2026.05" />
          <InfoRow label={t('settings.aboutScreen.systemType')} value={t('settings.aboutScreen.systemTypeValue')} />
          <InfoRow label={t('settings.aboutScreen.database')} value={t('settings.aboutScreen.databaseValue')} />
          <InfoRow label={t('settings.aboutScreen.platform')} value={t('settings.aboutScreen.platformValue')} />
        </SettingSection>

        {/* Support Section */}
        <SettingSection title={t('settings.aboutScreen.supportSection')}>
          <InfoRow
            label={t('settings.aboutScreen.supportPhone')}
            value={t('settings.aboutScreen.phoneNumber')}
          />
        </SettingSection>

        {/* About BexDre Section */}
        <SettingSection title={t('settings.aboutScreen.aboutBexDre')}>
          <View style={[styles.descBlock, isRTL && styles.descBlockRTL]}>
            <Text style={[styles.descHeading, { color: colors.black, textAlign: isRTL ? 'right' : 'left' }]}>
              BexDre
            </Text>
            {(['bexDreDesc1', 'bexDreDesc2', 'bexDreDesc3', 'bexDreDesc4'] as const).map((key) => (
              <Text
                key={key}
                style={[
                  styles.descBody,
                  {
                    color: colors.gray500,
                    textAlign: 'justify',
                    direction: isRTL ? 'rtl' : 'ltr',
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                  },
                ]}
              >
                {withBidiLatinTerms(t(`settings.aboutScreen.${key}`), isRTL, styles.descBody)}
              </Text>
            ))}
          </View>
        </SettingSection>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll:    { flex: 1 },
  body:      { padding: 16, paddingTop: 8 },

  logoBlock: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  logoShadow: {
    width: 90,
    height: 90,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 4,
  },
  logoShadowTablet: {
    width: 108,
    height: 108,
    borderRadius: 26,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
  },
  logoWrap: {
    width: 90,
    height: 90,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
  },
  logoWrapTablet: {
    width: 108,
    height: 108,
    borderRadius: 26,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
  },
  appNameTablet: {
    fontSize: 26,
  },
  tagline: {
    fontSize: 13,
  },
  taglineTablet: {
    fontSize: 15,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600' },

  descBlock:    { paddingVertical: 14, gap: 12 },
  descBlockRTL: { gap: RTL_SPACING.gap },
  descHeading:  { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  descBody:     { fontSize: 14, lineHeight: 22 },

  featuresSection: {
    marginTop: 14,
  },
  featuresTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  featuresTitleTablet: {
    fontSize: 16,
    marginBottom: 10,
  },
  featuresList: {
    gap: 8,
  },
  featuresListTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  featureItem: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  featureItemTablet: {
    width: '49.1%',
    padding: 12,
  },
  featureIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
});
