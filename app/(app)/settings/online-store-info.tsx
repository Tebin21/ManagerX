import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, KeyboardAvoidingView, Platform,
  TouchableOpacity, ToastAndroid, Alert, Linking, Image,
} from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { KeyboardAwareScrollView } from '@/components/common/KeyboardAwareScrollView';
import { SettingsHeader as AppHeader } from '@/components/settings/SettingsHeader';
import { SettingsTextInput as AppTextInput } from '@/components/settings/SettingsTextInput';
import { SettingsPrimaryButton as PrimaryButton } from '@/components/settings/SettingsPrimaryButton';
import { SettingSwitch } from '@/components/settings/SettingSwitch';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useOnlineStoreStore } from '@/store/onlineStoreStore';
import { useOnlineStoreSubscriptionStore } from '@/store/onlineStoreSubscriptionStore';
import { OnlineStoreComingSoon } from '@/components/settings/OnlineStoreComingSoon';
import { useBusinessStore } from '@/store/businessStore';
import { useResponsive } from '@/hooks/useResponsive';

function toLocalIraqiPhone(stored: string): string {
  const digits = stored.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('964')) return '0' + digits.slice(3);
  return stored;
}

function toInternationalIraqiPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('964')) return digits;
  if (digits.startsWith('0')) return '964' + digits.slice(1);
  return '964' + digits;
}

function normalizeSocialLink(raw: string, platform?: 'facebook' | 'instagram' | 'tiktok'): string {
  const t = raw.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith('@')) {
    const handle = t.slice(1);
    if (platform === 'facebook') return `https://facebook.com/${handle}`;
    if (platform === 'instagram') return `https://instagram.com/${handle}`;
    if (platform === 'tiktok') return `https://tiktok.com/@${handle}`;
  }
  if (!t.includes('.') && !t.includes('/') && platform) {
    if (platform === 'facebook') return `https://facebook.com/${t}`;
    if (platform === 'instagram') return `https://instagram.com/${t}`;
    if (platform === 'tiktok') return `https://tiktok.com/@${t}`;
  }
  return `https://${t.replace(/^\/+/, '')}`;
}

export default function OnlineStoreInfoScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isTablet, contentContainerStyle } = useResponsive();
  const { textAlign, flexDirection } = useRTL();
  const router = useRouter();

  const { storeInfoFields, load, saveStoreInfo, enabled: isStoreEnabled } = useOnlineStoreStore();
  const {
    isActive: hasActiveSubscription,
    loadSubscription,
  } = useOnlineStoreSubscriptionStore();
  const business = useBusinessStore();

  const [businessName, setBusinessName] = useState(storeInfoFields.businessName || business.name || '');
  const [logoUri, setLogoUri] = useState<string | null>(storeInfoFields.logoUri || null);
  const [phone, setPhone] = useState(storeInfoFields.phone || business.phone || '');
  const [phoneSecondary, setPhoneSecondary] = useState(storeInfoFields.phoneSecondary || '');
  const [address, setAddress] = useState(storeInfoFields.address || business.address || '');
  const [description, setDescription] = useState(storeInfoFields.description || '');
  const [facebookUrl, setFacebookUrl] = useState(storeInfoFields.facebookUrl || '');
  const [instagramUrl, setInstagramUrl] = useState(storeInfoFields.instagramUrl || '');
  const [tiktokUrl, setTiktokUrl] = useState(storeInfoFields.tiktokUrl || '');
  const [whatsappNumber, setWhatsappNumber] = useState(toLocalIraqiPhone(storeInfoFields.whatsappNumber || ''));
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(storeInfoFields.themeMode === 'light' ? 'light' : 'dark');
  const [hideOutOfStock, setHideOutOfStock] = useState<boolean>(storeInfoFields.hideOutOfStock ?? false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
    loadSubscription();
  }, []);

  useEffect(() => {
    setBusinessName(storeInfoFields.businessName || business.name || '');
    setLogoUri(storeInfoFields.logoUri || null);
    setPhone(storeInfoFields.phone || business.phone || '');
    setPhoneSecondary(storeInfoFields.phoneSecondary || '');
    setAddress(storeInfoFields.address || business.address || '');
    setDescription(storeInfoFields.description || '');
    setFacebookUrl(storeInfoFields.facebookUrl || '');
    setInstagramUrl(storeInfoFields.instagramUrl || '');
    setTiktokUrl(storeInfoFields.tiktokUrl || '');
    setWhatsappNumber(toLocalIraqiPhone(storeInfoFields.whatsappNumber || ''));
    setThemeMode(storeInfoFields.themeMode === 'light' ? 'light' : 'dark');
    setHideOutOfStock(storeInfoFields.hideOutOfStock ?? false);
  }, [storeInfoFields, business.name, business.phone, business.address]);

  const handlePickLogo = async () => {
    try {
      const { ensureGalleryAccess } = await import('@/lib/mediaAccess');
      const access = await ensureGalleryAccess();
      if (access !== 'granted') {
        Alert.alert(
          t('inventory.photoAccessNeededTitle', 'دەسەڵاتی وێنە پێویستە'),
          t('inventory.photoAccessNeededMessage', 'تکایە لە ڕێکخستنەکان ڕێگە بە دەستگەیشتن بە وێنە بدە'),
          [
            { text: t('common.cancel', 'پاشگەزبوونەوە'), style: 'cancel' },
            { text: t('common.openSettings', 'کردنەوەی ڕێکخستنەکان'), onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      const ImagePicker = await import('expo-image-picker');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const tempUri = result.assets[0].uri;
        try {
          const { copyToPermanentStorage } = await import('@/lib/imageStorage');
          const permanentUri = await copyToPermanentStorage(tempUri, 'online_store_logo');
          setLogoUri(permanentUri);
        } catch {
          setLogoUri(tempUri);
        }
      }
    } catch (err) {
      console.warn('[OnlineStoreInfo] pick logo failed:', err);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUri('');
  };

  async function handleSave() {
    setSaving(true);
    try {
      await saveStoreInfo({
        businessName: businessName.trim(),
        logoUri: logoUri || '',
        phone: phone.trim(),
        phoneSecondary: phoneSecondary.trim(),
        address: address.trim(),
        description: description.trim(),
        facebookUrl: normalizeSocialLink(facebookUrl, 'facebook'),
        instagramUrl: normalizeSocialLink(instagramUrl, 'instagram'),
        tiktokUrl: normalizeSocialLink(tiktokUrl, 'tiktok'),
        whatsappNumber: toInternationalIraqiPhone(whatsappNumber.trim()),
        themeMode,
        hideOutOfStock,
      });
      if (Platform.OS === 'android') {
        ToastAndroid.show(t('settings.onlineStoreInfoScreen.saved'), ToastAndroid.SHORT);
      }
      router.back();
    } finally {
      setSaving(false);
    }
  }

  // Gated: Show Coming Soon for users without an active Online Store subscription or enabled store
  if (!hasActiveSubscription && !isStoreEnabled) {
    return (
      <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('settings.onlineStoreInfoScreen.title')} showBack />
        <OnlineStoreComingSoon />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('settings.onlineStoreInfoScreen.title')} showBack />

        <KeyboardAwareScrollView contentContainerStyle={[styles.body, isTablet && contentContainerStyle]}>
          {/* 1. Web Store Logo / Cover Card (Independent from App Business Profile) */}
          <PremiumCard style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.black, textAlign }]}>
              {t('settings.onlineStoreInfoScreen.logoSection', 'لۆگۆ یان وێنەی وێب ستۆر')}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.gray500, textAlign }]}>
              {t('settings.onlineStoreInfoScreen.logoSub', 'وێنەیەکی جیاواز بۆ فرۆشگای ئۆنلاین دیاری بکە (جیاواز لە پرۆفایلی سەرەکی)')}
            </Text>

            {logoUri ? (
              <View style={styles.logoPreviewWrapper}>
                <Image
                  source={{ uri: logoUri }}
                  style={[styles.logoImage, { borderColor: colors.gray200 }]}
                  resizeMode="cover"
                />
                <View style={[styles.logoActionsRow, { flexDirection }]}>
                  <TouchableOpacity
                    onPress={handlePickLogo}
                    style={[styles.logoActionBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="camera-outline" size={16} color={colors.primary} />
                    <Text style={[styles.logoActionText, { color: colors.primary }]}>
                      {t('settings.onlineStoreInfoScreen.changeLogo', 'گۆڕینی وێنە')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleRemoveLogo}
                    style={[styles.logoActionBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    <Text style={[styles.logoActionText, { color: '#EF4444' }]}>
                      {t('settings.onlineStoreInfoScreen.removeLogo', 'سڕینەوەی وێنە')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handlePickLogo}
                style={[styles.logoPickerBox, { borderColor: colors.gray300, backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}
                activeOpacity={0.8}
              >
                <View style={[styles.logoPickerIconCircle, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                  <Ionicons name="image-outline" size={26} color={colors.primary} />
                </View>
                <Text style={[styles.logoPickerTitle, { color: colors.primary }]}>
                  {t('settings.onlineStoreInfoScreen.chooseLogo', 'دیاریکردنی وێنە')}
                </Text>
                <Text style={[styles.logoPickerHint, { color: colors.gray400 }]}>
                  {t('settings.onlineStoreInfoScreen.logoSub', 'وێنەی سەرەکی و لۆگۆی تایبەت بە وێب ستۆر')}
                </Text>
              </TouchableOpacity>
            )}
          </PremiumCard>

          {/* 2. Core Business Details (Name, Two Phones, Address) */}
          <PremiumCard style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.black, textAlign }]}>
              {t('settings.onlineStoreInfoScreen.businessDetails', 'زانیارییە سەرەکییەکان')}
            </Text>

            <AppTextInput
              label={t('settings.onlineStoreInfoScreen.businessName', 'ناوی بازرگانی لە وێب ستۆر')}
              placeholder={t('settings.onlineStoreInfoScreen.businessNamePlaceholder', 'ناوی فرۆشگاکەت بنووسە...')}
              value={businessName}
              onChangeText={setBusinessName}
            />

            <AppTextInput
              label={t('settings.onlineStoreInfoScreen.phone', 'ژمارەی تەلەفۆنی سەرەکی')}
              placeholder={t('settings.onlineStoreInfoScreen.phonePlaceholder', '0770xxxxxxx')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <AppTextInput
              label={t('settings.onlineStoreInfoScreen.phoneSecondary', 'ژمارەی تەلەفۆنی دووەم (ئیختیاری)')}
              placeholder={t('settings.onlineStoreInfoScreen.phoneSecondaryPlaceholder', '0750xxxxxxx')}
              value={phoneSecondary}
              onChangeText={setPhoneSecondary}
              keyboardType="phone-pad"
            />

            <AppTextInput
              label={t('settings.onlineStoreInfoScreen.address', 'ناونیشانی فرۆشگا')}
              placeholder={t('settings.onlineStoreInfoScreen.addressPlaceholder', 'سلێمانی، شەقامی سالم...')}
              value={address}
              onChangeText={setAddress}
            />
          </PremiumCard>

          {/* 3. Description & Social Media */}
          <PremiumCard style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.black, textAlign }]}>
              {t('settings.onlineStoreInfoScreen.section', 'وردەکاری و تۆڕە کۆمەڵایەتییەکان')}
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

          {/* 4. Display & Product Settings */}
          <PremiumCard style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.black, textAlign }]}>
              {t('settings.onlineStoreInfoScreen.displaySettings', 'ڕێکخستنەکانی نمایش')}
            </Text>

            {/* Online Store Theme Mode (Dark / Light) */}
            <View style={{ marginBottom: 16 }}>
              <Text style={[{ fontSize: 13, fontWeight: '700', marginBottom: 8, color: colors.black, textAlign }]}>
                {t('settings.onlineStoreInfoScreen.storeTheme') || 'ڕووکاری سەرەکی فرۆشگا'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {/* Dark Mode Option */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setThemeMode('dark')}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: themeMode === 'dark' ? colors.primary : colors.gray200,
                    backgroundColor: themeMode === 'dark' ? (isDark ? '#1E293B' : '#0F172A') : colors.white,
                  }}
                >
                  <Ionicons
                    name="moon"
                    size={17}
                    color={themeMode === 'dark' ? (isDark ? colors.primary : '#F1F5F9') : colors.gray400}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: themeMode === 'dark' ? (isDark ? colors.primary : '#F1F5F9') : colors.gray500,
                    }}
                  >
                    {t('settings.darkMode') || 'دۆخی تاریک'}
                  </Text>
                </TouchableOpacity>

                {/* Light Mode Option */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setThemeMode('light')}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: themeMode === 'light' ? colors.primary : colors.gray200,
                    backgroundColor: themeMode === 'light' ? (isDark ? 'rgba(212, 175, 55, 0.15)' : '#F8FAFC') : colors.white,
                  }}
                >
                  <Ionicons
                    name="sunny"
                    size={17}
                    color={themeMode === 'light' ? colors.primary : colors.gray400}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: themeMode === 'light' ? (isDark ? colors.primary : colors.black) : colors.gray500,
                    }}
                  >
                    {t('settings.lightMode') || 'دۆخی ڕووناک'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Hide Out of Stock Toggle */}
            <SettingSwitch
              icon="eye-off-outline"
              label={t('settings.onlineStoreInfoScreen.hideOutOfStock', 'شاردنەوەی کاڵا نەماوەکان لە وێب ستۆر')}
              sub={t('settings.onlineStoreInfoScreen.hideOutOfStockSub', 'ئەگەر کاڵایەک بڕەکەی بوو بە صفر لە ماڵپەڕ نیشان نادرێت تا دووبارە کڕینەوەی')}
              value={hideOutOfStock}
              onToggle={setHideOutOfStock}
            />
          </PremiumCard>

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
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, marginBottom: 12, lineHeight: 18 },
  multiline: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  logoPreviewWrapper: { marginTop: 6, gap: 10 },
  logoImage: { width: '100%', height: 160, borderRadius: 16, borderWidth: 1 },
  logoActionsRow: { flexDirection: 'row', gap: 10 },
  logoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  logoActionText: { fontSize: 12.5, fontWeight: '700' },
  logoPickerBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    gap: 6,
  },
  logoPickerIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoPickerTitle: { fontSize: 14, fontWeight: '700' },
  logoPickerHint: { fontSize: 11.5, textAlign: 'center' },
});
