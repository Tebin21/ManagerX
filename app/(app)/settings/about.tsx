import React from 'react';
import { View, Image, ScrollView, StyleSheet, Text as RNText } from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { useTranslation } from 'react-i18next';

import { SettingsHeader as AppHeader } from '@/components/settings/SettingsHeader';
import { SettingSection } from '@/components/settings/SettingSection';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL, RTL_SPACING } from '@/lib/rtl';
import { SYSTEM_FONT_OVERRIDE } from '@/lib/settingsFont';

// RN's `writingDirection` style is iOS-only (no Android view manager honors
// it), so per-paragraph RTL/LTR correctness can't rely on style props alone —
// it has to be encoded in the text itself via real Unicode bidi controls,
// which both platforms' native text shapers (ICU/CoreText) resolve the same
// way. RLM is a strong, invisible RTL character: prefixing the paragraph with
// it anchors the paragraph's bidi base direction to RTL even when the first
// visible word is a Latin term (e.g. a sentence starting with "BexDre"),
// which is what was pushing the justified last line to align left instead of
// right. LRI/PDI isolate each embedded Latin run (BexDre, ERP, POS, API,
// UI/UX, ...) so it can never get reordered or have
// its characters split by the surrounding RTL paragraph; the nested Text's
// own font/writingDirection overrides are kept as an iOS-side belt-and-
// suspenders and to render the run in a font that actually has Latin glyphs
// (Rudaw doesn't). English paragraphs are returned untouched.
const RLM = String.fromCharCode(0x200f); // Right-to-Left Mark — invisible, strong RTL
const LRI = String.fromCharCode(0x2066); // Left-to-Right Isolate
const PDI = String.fromCharCode(0x2069); // Pop Directional Isolate (closes LRI)
const LATIN_TERM = /[A-Za-z0-9][A-Za-z0-9/]*/g;

function withBidiLatinTerms(text: string, isRTL: boolean): React.ReactNode {
  if (!isRTL) return text;

  const source = RLM + text;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  for (const match of source.matchAll(LATIN_TERM)) {
    const start = match.index ?? 0;
    if (start > lastIndex) parts.push(source.slice(lastIndex, start));
    parts.push(
      <RNText key={key++} style={{ fontFamily: SYSTEM_FONT_OVERRIDE, writingDirection: 'ltr' }}>
        {LRI}{match[0]}{PDI}
      </RNText>
    );
    lastIndex = start + match[0].length;
  }
  if (lastIndex < source.length) parts.push(source.slice(lastIndex));
  return parts;
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
                {withBidiLatinTerms(t(`settings.aboutScreen.${key}`), isRTL)}
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
