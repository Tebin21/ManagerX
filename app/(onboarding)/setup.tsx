import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SupportFooter } from '@/components/ui/SupportFooter';
import { BusinessTypeSelector } from '@/components/setup/BusinessTypeSelector';
import { LogoUploader } from '@/components/setup/LogoUploader';
import { useBusiness } from '@/hooks/useBusiness';
import { BusinessType } from '@/constants/config';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useRTL } from '@/lib/rtl';

export default function SetupScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isRTL, textAlign } = useRTL();
  const { saveAndSetBusiness } = useBusiness();

  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t('setup.validation.nameRequired');
    if (!businessType) e.type = t('setup.validation.typeRequired');
    if (!phone.trim()) e.phone = t('setup.validation.phoneRequired');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await saveAndSetBusiness({
        name: name.trim(),
        type: businessType!,
        phone: phone.trim(),
        address: address.trim(),
        logoUri,
      });
      router.replace('/(app)/dashboard');
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={[Colors.gradientStart, Colors.gradientMid]}
            style={styles.header}
          >
            <MotiView
              from={{ opacity: 0, translateY: -10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', damping: 18, delay: 100 }}
            >
              <Text style={[styles.headerTitle, { textAlign }]}>{t('setup.title')}</Text>
              <Text style={[styles.headerSub, { textAlign }]}>{t('setup.subtitle')}</Text>
            </MotiView>
          </LinearGradient>

          <MotiView
            from={{ opacity: 0, translateY: 24 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 100, delay: 200 }}
            style={styles.card}
          >
            <View style={styles.logoSection}>
              <LogoUploader uri={logoUri} onSelect={setLogoUri} />
              <Text style={styles.logoHint}>{t('setup.logoLabel')}</Text>
            </View>

            <AppTextInput
              label={t('setup.businessName')}
              placeholder={t('setup.businessNamePlaceholder')}
              value={name}
              onChangeText={setName}
              error={errors.name}
            />

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { textAlign }]}>{t('setup.businessType')}</Text>
              <BusinessTypeSelector selected={businessType} onSelect={setBusinessType} />
              {errors.type && <Text style={[styles.fieldError, { textAlign }]}>{errors.type}</Text>}
            </View>

            <AppTextInput
              label={t('setup.phone')}
              placeholder={t('setup.phonePlaceholder')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              error={errors.phone}
            />

            <AppTextInput
              label={t('setup.address')}
              placeholder={t('setup.addressPlaceholder')}
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={2}
              style={{ height: 80, paddingTop: 14 }}
            />

            <View style={styles.btnRow}>
              <PrimaryButton
                label={t('setup.saveBtn')}
                onPress={handleSave}
                loading={saving}
              />
            </View>
          </MotiView>

          <SupportFooter />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.gray50 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 32 },
  header: {
    paddingTop: 60,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 20,
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
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: Theme.radius.card,
    padding: 24,
    ...Theme.shadow.card,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoHint: {
    fontSize: 12,
    color: Colors.gray400,
    marginTop: 6,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.gray600,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  fieldError: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
  },
  btnRow: {
    marginTop: 8,
  },
});
