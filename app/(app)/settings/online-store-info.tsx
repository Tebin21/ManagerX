import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, TouchableOpacity, ToastAndroid,
} from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { KeyboardAwareScrollView } from '@/components/common/KeyboardAwareScrollView';
import { SettingsHeader as AppHeader } from '@/components/settings/SettingsHeader';
import { SettingsTextInput as AppTextInput } from '@/components/settings/SettingsTextInput';
import { SettingsPrimaryButton as PrimaryButton } from '@/components/settings/SettingsPrimaryButton';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useOnlineStoreStore } from '@/store/onlineStoreStore';
import { useOnlineStoreSubscriptionStore } from '@/store/onlineStoreSubscriptionStore';
import { OnlineStoreLockedCard } from '@/components/dashboard/OnlineStoreLockedCard';
import { useBusinessStore } from '@/store/businessStore';

export default function OnlineStoreInfoScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { textAlign } = useRTL();
  const router = useRouter();

  const { storeInfoFields, load, saveStoreInfo } = useOnlineStoreStore();
  const {
    isActive: hasActiveSubscription, expired: subscriptionExpired, isLegacyActiveStore,
    loadSubscription,
  } = useOnlineStoreSubscriptionStore();
  const business = useBusinessStore();

  const [description, setDescription] = useState(storeInfoFields.description);
  const [facebookUrl, setFacebookUrl] = useState(storeInfoFields.facebookUrl);
  const [instagramUrl, setInstagramUrl] = useState(storeInfoFields.instagramUrl);
  const [tiktokUrl, setTiktokUrl] = useState(storeInfoFields.tiktokUrl);
  const [whatsappNumber, setWhatsappNumber] = useState(storeInfoFields.whatsappNumber);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
    loadSubscription();
  }, []);

  // Reflect freshly-loaded values once load() resolves (covers landing on this
  // screen directly, before the parent screen's own load() has populated this).
  useEffect(() => {
    setDescription(storeInfoFields.description);
    setFacebookUrl(storeInfoFields.facebookUrl);
    setInstagramUrl(storeInfoFields.instagramUrl);
    setTiktokUrl(storeInfoFields.tiktokUrl);
    setWhatsappNumber(storeInfoFields.whatsappNumber);
  }, [storeInfoFields]);

  async function handleSave() {
    setSaving(true);
    try {
      await saveStoreInfo({
        description: description.trim(),
        facebookUrl: facebookUrl.trim(),
        instagramUrl: instagramUrl.trim(),
        tiktokUrl: tiktokUrl.trim(),
        whatsappNumber: whatsappNumber.trim(),
      });
      if (Platform.OS === 'android') {
        ToastAndroid.show(t('settings.onlineStoreInfoScreen.saved'), ToastAndroid.SHORT);
      }
      router.back();
    } finally {
      setSaving(false);
    }
  }

  // Defense-in-depth — this screen is normally unreachable when locked (the entry
  // point in online-store.tsx already hides itself), but render the read-only locked
  // view too in case the subscription lapses while this screen is already open.
  if (!hasActiveSubscription) {
    return (
      <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('settings.onlineStoreInfoScreen.title')} showBack />
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <OnlineStoreLockedCard expired={subscriptionExpired} legacy={isLegacyActiveStore} />
          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('settings.onlineStoreInfoScreen.title')} showBack />

        <KeyboardAwareScrollView contentContainerStyle={styles.body}>
          <PremiumCard style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.black, textAlign }]}>
              {t('settings.onlineStoreInfoScreen.section')}
            </Text>

            <AppTextInput
              label={t('settings.onlineStoreInfoScreen.description')}
              placeholder={t('settings.onlineStoreInfoScreen.descriptionPlaceholder')}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={styles.multiline}
            />
            <AppTextInput
              label={t('settings.onlineStoreInfoScreen.facebookUrl')}
              placeholder="https://facebook.com/yourpage"
              value={facebookUrl}
              onChangeText={setFacebookUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <AppTextInput
              label={t('settings.onlineStoreInfoScreen.instagramUrl')}
              placeholder="https://instagram.com/yourpage"
              value={instagramUrl}
              onChangeText={setInstagramUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <AppTextInput
              label={t('settings.onlineStoreInfoScreen.tiktokUrl')}
              placeholder="https://tiktok.com/@yourpage"
              value={tiktokUrl}
              onChangeText={setTiktokUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <AppTextInput
              label={t('settings.onlineStoreInfoScreen.whatsappNumber')}
              placeholder={t('settings.onlineStoreInfoScreen.whatsappNumberPlaceholder')}
              value={whatsappNumber}
              onChangeText={setWhatsappNumber}
              keyboardType="phone-pad"
            />
          </PremiumCard>

          <TouchableOpacity
            onPress={() => router.push('/(app)/settings/profile' as never)}
            activeOpacity={0.8}
            style={[styles.contactRow, { backgroundColor: colors.softBlue, borderColor: colors.lightBlue }]}
          >
            <Text style={[styles.contactText, { color: colors.gray600, textAlign }]}>
              {t('settings.onlineStoreInfoScreen.contactSection')}
              {business.phone ? ` (${business.phone})` : ''}
            </Text>
            <Text style={[styles.contactLink, { color: colors.primary }]}>
              {t('settings.onlineStoreInfoScreen.editProfile')}
            </Text>
          </TouchableOpacity>

          <PrimaryButton
            label={t('settings.onlineStoreInfoScreen.save')}
            onPress={handleSave}
            loading={saving}
          />

          <View style={{ height: 32 }} />
        </KeyboardAwareScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body:      { padding: 16, paddingTop: 14 },
  card:      { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  multiline: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  contactRow: {
    borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16, gap: 4,
  },
  contactText: { fontSize: 12.5, lineHeight: 18 },
  contactLink: { fontSize: 13, fontWeight: '700' },
});
