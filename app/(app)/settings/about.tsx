import React from 'react';
import { View, Image, ScrollView, StyleSheet, TextStyle } from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { useTranslation } from 'react-i18next';

import { SettingsHeader as AppHeader } from '@/components/settings/SettingsHeader';
import { SettingSection } from '@/components/settings/SettingSection';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL, RTL_SPACING } from '@/lib/rtl';
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
  const { colors } = useAppTheme();
  const { isRTL } = useRTL();

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
          <View style={[styles.logoWrap, { backgroundColor: colors.primary + '15' }]}>
            <Image source={require('@/assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
          </View>
          <Text style={[styles.appName, { color: colors.black }]}>{t('common.appName')}</Text>
          <Text style={[styles.tagline, { color: colors.gray400 }]}>
            {t('settings.aboutScreen.tagline')}
          </Text>
        </View>

        <SettingSection title={t('settings.aboutScreen.appInfo')}>
          <InfoRow label={t('settings.aboutScreen.version')} value="1.0.0" />
          <InfoRow label={t('settings.aboutScreen.build')}   value="2026.05" />
        </SettingSection>

        <SettingSection title={t('settings.aboutScreen.supportSection')}>
          {/* Phone displayed as plain text — no Linking, no dialer, no WhatsApp */}
          <InfoRow
            label={t('settings.aboutScreen.supportPhone')}
            value={t('settings.aboutScreen.phoneNumber')}
          />
        </SettingSection>

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
  container:  { flex: 1 },
  scroll:     { flex: 1 },
  body:       { padding: 16, paddingTop: 8 },

  logoBlock: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  logoWrap: {
    width: 80, height: 80, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  logoImage: { width: 48, height: 48 },
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

  descBlock:    { paddingVertical: 14, gap: 12 },
  descBlockRTL: { gap: RTL_SPACING.gap },
  descHeading:  { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  descBody:     { fontSize: 14, lineHeight: 22 },
});
