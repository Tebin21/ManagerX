import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SettingsHeader as AppHeader } from '@/components/settings/SettingsHeader';
import { SettingsTextInput as AppTextInput } from '@/components/settings/SettingsTextInput';
import { SettingsPrimaryButton as PrimaryButton } from '@/components/settings/SettingsPrimaryButton';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { LogoUploader } from '@/components/setup/LogoUploader';
import { BusinessTypeSelector } from '@/components/setup/BusinessTypeSelector';
import { useBusiness } from '@/hooks/useBusiness';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { Colors } from '@/constants/colors';

export default function BusinessProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { textAlign } = useRTL();
  const { colors } = useAppTheme();
  const business = useBusiness();

  const [name, setName]             = useState(business.name ?? '');
  const [businessType, setBusinessType] = useState(business.type ?? '');
  const [phone, setPhone]           = useState(business.phone ?? '');
  const [address, setAddress]       = useState(business.address ?? '');
  const [logoUri, setLogoUri]       = useState<string | null>(business.logoUri);
  const [saving, setSaving]   = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert(t('common.required'), t('settings.profileScreen.nameRequired'));
      return;
    }
    setSaving(true);
    try {
      await business.saveAndSetBusiness({
        name: name.trim(),
        type: businessType.trim(),
        phone: phone.trim(),
        address: address.trim(),
        logoUri,
      });
      router.back();
    } catch {
      Alert.alert(t('common.error'), t('settings.profileScreen.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('settings.profileScreen.title')} showBack />

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={styles.logoSection}>
            <LogoUploader uri={logoUri} onSelect={setLogoUri} />
            <Text style={styles.logoHint}>{t('settings.profileScreen.logoHint')}</Text>
          </View>

          <PremiumCard style={styles.card}>
            <Text style={[styles.sectionTitle, { textAlign }]}>{t('settings.profileScreen.businessInfo')}</Text>
            <AppTextInput
              label={t('settings.profileScreen.nameStar')}
              placeholder={t('settings.profileScreen.namePlaceholder')}
              value={name}
              onChangeText={setName}
            />
            <BusinessTypeSelector
              value={businessType}
              onChangeText={setBusinessType}
            />
            <AppTextInput
              label={t('settings.profileScreen.phone')}
              placeholder={t('settings.profileScreen.phonePlaceholder')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <AppTextInput
              label={t('settings.profileScreen.address')}
              placeholder={t('settings.profileScreen.addressPlaceholder')}
              value={address}
              onChangeText={setAddress}
            />
          </PremiumCard>

          <PrimaryButton
            label={t('settings.profileScreen.saveChanges')}
            onPress={handleSave}
            loading={saving}
          />

          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradHeader: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  body: { padding: 16, paddingTop: 14 },

  logoSection: { alignItems: 'center', marginBottom: 20, paddingTop: 8 },
  logoHint: { fontSize: 12, color: Colors.gray400, marginTop: 8 },

  card: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.black, marginBottom: 14 },
});
