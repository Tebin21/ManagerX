import React, { useCallback, useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { copyToPermanentStorage } from '@/lib/imageStorage';
import { ensureCameraAccess, ensureGalleryAccess } from '@/lib/mediaAccess';
import { AppSheet, AppSheetHeader, AppSheetOption } from '@/components/ui/AppSheet';
import { SavedImagesModal } from '@/components/purchases/SavedImagesModal';
import { useSavedProductStore, SavedProductPreset } from '@/store/savedProductStore';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';

interface Props {
  uri: string | null;
  onSelect: (uri: string) => void;
  onRemove: () => void;
  label?: string;
  onSelectSavedItem?: (item: SavedProductPreset) => void;
}

export function ProductImagePicker({
  uri,
  onSelect,
  onRemove,
  label,
  onSelectSavedItem,
}: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');
  const savedCount = useSavedProductStore((s) => s.savedPresets.length);

  const [showModal, setShowModal] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);

  const pickFromCamera = useCallback(async () => {
    setShowModal(false);
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
        quality: 0.7,
        base64: false,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const tempUri = result.assets[0].uri;
      try {
        const permanentUri = await copyToPermanentStorage(tempUri, 'product_images');
        onSelect(permanentUri);
      } catch (saveErr) {
        console.warn('[ProductImagePicker] permanent save skipped, using temp URI:', saveErr);
        onSelect(tempUri);
      }
    } catch (err) {
      console.error('[ProductImagePicker] camera error:', err);
      Alert.alert(t('common.error'), t('common.tryAgain'));
    }
  }, [onSelect, t]);

  const pickFromGallery = useCallback(async () => {
    setShowModal(false);
    try {
      const access = await ensureGalleryAccess();
      if (access === 'denied-first-time') return;
      if (access === 'denied-repeat') {
        Alert.alert(
          t('inventory.photoAccessNeededTitle'),
          t('inventory.photoAccessNeededMessage'),
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
        quality: 0.7,
        base64: false,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const tempUri = result.assets[0].uri;
      try {
        const permanentUri = await copyToPermanentStorage(tempUri, 'product_images');
        onSelect(permanentUri);
      } catch (saveErr) {
        console.warn('[ProductImagePicker] permanent save skipped, using temp URI:', saveErr);
        onSelect(tempUri);
      }
    } catch (err) {
      console.error('[ProductImagePicker] gallery error:', err);
      Alert.alert(t('common.error'), t('common.tryAgain'));
    }
  }, [onSelect, t]);

  const handleSelectFromSaved = useCallback((item: SavedProductPreset) => {
    onSelect(item.imageUri);
    if (onSelectSavedItem) {
      onSelectSavedItem(item);
    }
  }, [onSelect, onSelectSavedItem]);

  return (
    <View style={styles.wrapper}>
      {label ? (
        <View style={{ marginBottom: 10 }}>
          <Text
            style={[
              styles.label,
              { color: colors.gray600, textAlign, marginBottom: 2 },
              isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
            ]}
          >
            {label}
          </Text>
          <Text
            style={[
              styles.labelSub,
              { color: colors.gray400, textAlign },
              isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
            ]}
          >
            {isKurdish
              ? 'وێنەی نوێ بگرە یان لە سەڤکراوەکان هەڵبژێرە'
              : 'Take new photo or choose from saved library'}
          </Text>
        </View>
      ) : null}

      <View style={[styles.pickerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {uri ? (
          <>
            {/* ── Preview ── */}
            <View style={styles.previewWrap}>
              <Image
                source={{ uri }}
                style={styles.preview}
                resizeMode="cover"
              />
              {/* Change button overlay */}
              <TouchableOpacity
                style={[styles.changeBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="camera" size={14} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Action column on the side */}
            <View style={styles.actionColumn}>
              {/* Prominent Saved Images Button */}
              <TouchableOpacity
                style={[
                  styles.savedImagesBtn,
                  {
                    backgroundColor: isDark ? colors.gray100 : colors.softBlue,
                    borderColor: isDark ? colors.gray200 : colors.primary + '35',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
                onPress={() => setShowSavedModal(true)}
                activeOpacity={0.8}
              >
                <View style={[styles.savedIconBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="images" size={18} color="#FFFFFF" />
                </View>
                <View style={[styles.savedTextWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <View style={[styles.savedHeaderLine, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text
                      style={[
                        styles.savedBtnTitle,
                        { color: colors.primary },
                        isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                    >
                      {isKurdish ? 'وێنە پاشەکەوتکراوەکان' : 'Saved Photos'}
                    </Text>
                    {savedCount > 0 && (
                      <View style={[styles.savedCountBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.savedCountText}>{savedCount}</Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.savedBtnSub,
                      { color: colors.gray400 },
                      isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
                    ]}
                    numberOfLines={1}
                  >
                    {isKurdish
                      ? 'هەڵبژاردن و پڕکردنەوەی خۆکارانە'
                      : 'Auto-fill name & photo'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Remove button */}
              <TouchableOpacity
                style={[styles.removeBtn, { backgroundColor: '#FEE2E2', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={onRemove}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={15} color={Colors.error} />
                <Text style={[styles.removeBtnText, { color: Colors.error }]}>
                  {t('inventory.removePhoto')}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* Button 1: Add Photo */}
            <TouchableOpacity
              style={[
                styles.pickerBtn,
                styles.pickerBtnDashed,
                {
                  backgroundColor: isDark ? colors.gray100 : colors.gray50,
                  borderColor: colors.gray200,
                },
              ]}
              onPress={() => setShowModal(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.btnIconBox, { backgroundColor: colors.softBlue }]}>
                <Ionicons name="camera-outline" size={20} color={colors.primary} />
              </View>
              <Text
                style={[
                  styles.btnTitle,
                  { color: colors.black },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
                numberOfLines={1}
              >
                {t('inventory.addPhoto')}
              </Text>
              <Text
                style={[
                  styles.btnSub,
                  { color: colors.gray400 },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
                numberOfLines={1}
              >
                {isKurdish ? 'کامێرا یان گەلەری' : 'Camera or Gallery'}
              </Text>
            </TouchableOpacity>

            {/* Button 2: Saved Photos */}
            <TouchableOpacity
              style={[
                styles.pickerBtn,
                styles.pickerBtnSolid,
                {
                  backgroundColor: isDark ? colors.gray100 : colors.softBlue,
                  borderColor: isDark ? colors.gray200 : colors.primary + '35',
                },
              ]}
              onPress={() => setShowSavedModal(true)}
              activeOpacity={0.8}
            >
              <View style={styles.iconContainer}>
                <View style={[styles.btnIconBox, { backgroundColor: colors.primary }]}>
                  <Ionicons name="images" size={19} color="#FFFFFF" />
                </View>
                {savedCount > 0 && (
                  <View style={[styles.floatingBadge, { backgroundColor: colors.error }]}>
                    <Text style={styles.floatingBadgeText}>{savedCount}</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.btnTitle,
                  { color: colors.primary },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {isKurdish ? 'وێنە پاشەکەوتکراوەکان' : 'Saved Photos'}
              </Text>
              <Text
                style={[
                  styles.btnSub,
                  { color: colors.gray400 },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
                numberOfLines={1}
              >
                {isKurdish ? 'پڕکردنەوەی خۆکارانە' : 'Auto-fill name & photo'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ── Source selection sheet ── */}
      <AppSheet visible={showModal} onClose={() => setShowModal(false)}>
        <AppSheetHeader title={t('inventory.imageSource')} />

        <AppSheetOption
          icon="camera-outline"
          label={t('inventory.takePhoto')}
          indicator="chevron"
          onPress={pickFromCamera}
        />
        <AppSheetOption
          icon="images-outline"
          label={t('inventory.chooseFromGallery')}
          indicator="chevron"
          onPress={pickFromGallery}
        />
        <AppSheetOption
          icon="bookmark-outline"
          label={isKurdish ? 'وێنە پاشەکەوتکراوەکان (سەڤکراوەکان)' : 'Saved Photos Library'}
          indicator="chevron"
          onPress={() => {
            setShowModal(false);
            setShowSavedModal(true);
          }}
        />

        <TouchableOpacity
          style={[styles.cancelBtn, { borderTopColor: colors.gray100 }]}
          onPress={() => setShowModal(false)}
          activeOpacity={0.75}
        >
          <Text style={[styles.cancelText, { color: colors.gray500 }]}>
            {t('common.cancel')}
          </Text>
        </TouchableOpacity>
      </AppSheet>

      {/* ── Saved Images Modal ── */}
      <SavedImagesModal
        visible={showSavedModal}
        onClose={() => setShowSavedModal(false)}
        onSelect={handleSelectFromSaved}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  labelSub: {
    fontSize: 11.5,
    marginTop: 1,
  },

  pickerRow: {
    alignItems: 'center',
    gap: 12,
  },

  /* Equal picker buttons (when no image is selected) */
  pickerBtn: {
    flex: 1,
    height: 98,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 4,
  },
  pickerBtnDashed: {
    borderStyle: 'dashed',
  },
  pickerBtnSolid: {
    borderStyle: 'solid',
  },
  btnIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
  },
  floatingBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  btnTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  btnSub: {
    fontSize: 10.5,
    textAlign: 'center',
  },

  /* Preview (image selected) */
  previewWrap: {
    width: 95,
    height: 95,
    borderRadius: Theme.radius.lg,
    overflow: 'visible',
  },
  preview: {
    width: 95,
    height: 95,
    borderRadius: Theme.radius.lg,
  },
  changeBtn: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },

  /* Action column next to preview / placeholder */
  actionColumn: {
    flex: 1,
    gap: 8,
    justifyContent: 'center',
  },

  /* Saved Images Button */
  savedImagesBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 88,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  savedIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedTextWrap: {
    flex: 1,
    gap: 2,
  },
  savedHeaderLine: {
    alignItems: 'center',
    gap: 6,
  },
  savedBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  savedCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  savedCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  savedBtnSub: {
    fontSize: 11,
  },

  /* Remove button */
  removeBtn: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Theme.radius.md,
    alignSelf: 'flex-start',
  },
  removeBtnText: { fontSize: 12, fontWeight: '600' },

  /* Source selection sheet */
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

