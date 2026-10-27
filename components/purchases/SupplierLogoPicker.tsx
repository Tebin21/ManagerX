import React, { useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { copyToPermanentStorage, resolveImageUri } from '@/lib/imageStorage';
import { ensureCameraAccess, ensureGalleryAccess } from '@/lib/mediaAccess';
import { AppSheet, AppSheetHeader, AppSheetOption } from '@/components/ui/AppSheet';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';

interface SupplierLogoPickerProps {
  imageUri: string | null;
  onImageChange: (uri: string | null) => void;
  supplierName?: string;
  size?: number;
}

export function SupplierLogoPicker({
  imageUri,
  onImageChange,
  supplierName,
  size = 48,
}: SupplierLogoPickerProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign } = useRTL();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const [showSheet, setShowSheet] = useState(false);

  const resolvedUri = resolveImageUri(imageUri);

  const handleOpenSheet = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    setShowSheet(true);
  }, []);

  const handlePickFromCamera = useCallback(async () => {
    setShowSheet(false);
    try {
      const access = await ensureCameraAccess();
      if (access === 'denied-first-time') return;
      if (access === 'denied-repeat') {
        Alert.alert(
          t('inventory.cameraAccessNeededTitle'),
          t('inventory.cameraAccessNeededMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.openSettings'), onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      const ImagePicker = await import('expo-image-picker');
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const tempUri = result.assets[0].uri;
      let finalUri = tempUri;
      try {
        finalUri = await copyToPermanentStorage(tempUri, 'supplier_logos');
      } catch (saveErr) {
        console.warn('[SupplierLogoPicker] permanent save skipped, using temp URI:', saveErr);
      }
      onImageChange(finalUri);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {}
    } catch (err) {
      console.error('[SupplierLogoPicker] camera error:', err);
      Alert.alert(t('common.error'), t('common.tryAgain'));
    }
  }, [onImageChange, t]);

  const handlePickFromGallery = useCallback(async () => {
    setShowSheet(false);
    try {
      const access = await ensureGalleryAccess();
      if (access === 'denied-first-time') return;
      if (access === 'denied-repeat') {
        Alert.alert(
          t('inventory.galleryAccessNeededTitle'),
          t('inventory.galleryAccessNeededMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.openSettings'), onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      const ImagePicker = await import('expo-image-picker');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const tempUri = result.assets[0].uri;
      let finalUri = tempUri;
      try {
        finalUri = await copyToPermanentStorage(tempUri, 'supplier_logos');
      } catch (saveErr) {
        console.warn('[SupplierLogoPicker] permanent save skipped, using temp URI:', saveErr);
      }
      onImageChange(finalUri);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {}
    } catch (err) {
      console.error('[SupplierLogoPicker] gallery error:', err);
      Alert.alert(t('common.error'), t('common.tryAgain'));
    }
  }, [onImageChange, t]);

  const handleRemove = useCallback(() => {
    setShowSheet(false);
    onImageChange(null);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {}
  }, [onImageChange]);

  const cleanSuppName = supplierName?.trim();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: 14,
            borderColor: resolvedUri ? colors.primary : colors.gray200,
            backgroundColor: resolvedUri ? (isDark ? colors.gray100 : '#FFFFFF') : colors.gray50,
          },
        ]}
        onPress={handleOpenSheet}
        activeOpacity={0.75}
        accessibilityLabel={isKuLanguage ? 'لۆگۆی دابینکەر' : 'Supplier Logo'}
        accessibilityRole="button"
      >
        {resolvedUri ? (
          <>
            <Image
              source={{ uri: resolvedUri }}
              style={[
                styles.image,
                {
                  width: size - 3,
                  height: size - 3,
                  borderRadius: 12.5,
                },
              ]}
              resizeMode="cover"
            />
            {/* Tiny badge indicating edit */}
            <View
              style={[
                styles.editBadge,
                {
                  backgroundColor: colors.primary,
                  borderColor: isDark ? colors.gray100 : '#FFFFFF',
                  [isRTL ? 'left' : 'right']: -3,
                },
              ]}
            >
              <Ionicons name="pencil" size={8} color="#FFFFFF" />
            </View>
          </>
        ) : (
          <>
            <Ionicons name="business-outline" size={20} color={colors.primary} />
            {/* Tiny plus badge */}
            <View
              style={[
                styles.addBadge,
                {
                  backgroundColor: colors.primary,
                  borderColor: isDark ? colors.gray100 : '#FFFFFF',
                  [isRTL ? 'left' : 'right']: -3,
                },
              ]}
            >
              <Ionicons name="add" size={9} color="#FFFFFF" />
            </View>
          </>
        )}
      </TouchableOpacity>

      {/* Action Sheet Modal */}
      <AppSheet visible={showSheet} onClose={() => setShowSheet(false)}>
        <AppSheetHeader
          title={isKuLanguage ? 'لۆگۆ و وێنەی دابینکەر' : 'Supplier Brand / Logo'}
          onClose={() => setShowSheet(false)}
        />
        <Text
          style={[
            styles.sheetSubtitle,
            isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
            { color: colors.gray400, textAlign },
          ]}
        >
          {cleanSuppName
            ? cleanSuppName
            : (isKuLanguage ? 'دیاریکردنی وێنە یان لۆگۆی براندی دابینکەر' : 'Assign custom brand logo or image')}
        </Text>

        {resolvedUri && (
          <View style={styles.sheetPreviewWrap}>
            <View
              style={[
                styles.sheetPreviewBox,
                {
                  borderColor: colors.primary,
                  backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                },
              ]}
            >
              <Image
                source={{ uri: resolvedUri }}
                style={styles.sheetPreviewImage}
                resizeMode="cover"
              />
            </View>
            {cleanSuppName ? (
              <Text
                style={[
                  styles.sheetPreviewName,
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  { color: colors.black, textAlign: 'center' },
                ]}
              >
                {cleanSuppName}
              </Text>
            ) : null}
          </View>
        )}

        <AppSheetOption
          icon="camera-outline"
          label={isKuLanguage ? 'گرتنی وێنە بە کامێرا' : 'Take Photo with Camera'}
          indicator="chevron"
          onPress={handlePickFromCamera}
        />

        <AppSheetOption
          icon="images-outline"
          label={isKuLanguage ? 'هەڵبژاردن لە گەلەری' : 'Choose from Gallery'}
          indicator="chevron"
          onPress={handlePickFromGallery}
        />

        {resolvedUri && (
          <TouchableOpacity
            style={[styles.removeOptionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={handleRemove}
            activeOpacity={0.7}
          >
            <View style={[styles.removeIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </View>
            <Text
              style={[
                styles.removeOptionLabel,
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                { color: '#EF4444', textAlign },
              ]}
            >
              {isKuLanguage ? 'سڕینەوەی لۆگۆ' : 'Remove Logo'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.sheetCancelBtn, { borderTopColor: colors.gray100 }]}
          onPress={() => setShowSheet(false)}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.sheetCancelText,
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
              { color: colors.gray500, textAlign: 'center' },
            ]}
          >
            {t('common.cancel')}
          </Text>
        </TouchableOpacity>
      </AppSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  image: {
    overflow: 'hidden',
  },
  editBadge: {
    position: 'absolute',
    bottom: -3,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  addBadge: {
    position: 'absolute',
    bottom: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
  },
  sheetPreviewWrap: {
    alignItems: 'center',
    marginVertical: 12,
  },
  sheetPreviewBox: {
    width: 74,
    height: 74,
    borderRadius: 20,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  sheetPreviewImage: {
    width: 74,
    height: 74,
  },
  sheetPreviewName: {
    fontSize: 13,
    marginTop: 6,
  },
  sheetCancelBtn: {
    paddingVertical: 14,
    borderTopWidth: 1,
    marginTop: 6,
    alignItems: 'center',
  },
  sheetCancelText: {
    fontSize: 14,
  },
  sheetSubtitle: {
    fontSize: 12.5,
    marginTop: -8,
    marginBottom: 8,
  },
  removeOptionRow: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  removeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeOptionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
