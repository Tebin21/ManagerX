import React, { useCallback, useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { copyToPermanentStorage } from '@/lib/imageStorage';
import { AppSheet, AppSheetHeader, AppSheetOption } from '@/components/ui/AppSheet';

interface Props {
  uri: string | null;
  onSelect: (uri: string) => void;
  onRemove: () => void;
  label?: string;
}

export function ProductImagePicker({ uri, onSelect, onRemove, label }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { textAlign } = useRTL();
  const [showModal, setShowModal] = useState(false);

  const pickFromCamera = useCallback(async () => {
    setShowModal(false);
    try {
      const ImagePicker = await import('expo-image-picker');

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('inventory.cameraPermDenied'));
        return;
      }

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
      // Use the picker directly — expo-image-picker handles permissions internally
      const { launchImageLibraryAsync } = await import('expo-image-picker');

      const result = await launchImageLibraryAsync({
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

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: colors.gray600, textAlign }]}>{label}</Text>
      ) : null}

      <View style={styles.pickerRow}>
        {uri ? (
          /* ── Preview ── */
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
        ) : (
          /* ── Empty placeholder ── */
          <TouchableOpacity
            style={[
              styles.placeholder,
              { backgroundColor: colors.gray100, borderColor: colors.gray200 },
            ]}
            onPress={() => setShowModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="image-outline" size={26} color={colors.gray400} />
            <Text style={[styles.placeholderText, { color: colors.gray400 }]}>
              {t('inventory.addPhoto')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Remove / hint text */}
        {uri ? (
          <TouchableOpacity
            style={[styles.removeBtn, { backgroundColor: '#FEE2E2' }]}
            onPress={onRemove}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
            <Text style={[styles.removeBtnText, { color: Colors.error }]}>
              {t('inventory.removePhoto')}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.hint, { color: colors.gray400, textAlign }]}>
            {t('inventory.addPhoto')}
          </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:     { marginBottom: 16 },
  label: {
    fontSize:     13,
    fontWeight:   '500',
    marginBottom: 8,
    letterSpacing: 0.2,
  },

  pickerRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           14,
  },

  /* Placeholder (no image selected) */
  placeholder: {
    width:        100,
    height:       100,
    borderRadius: Theme.radius.lg,
    borderWidth:  1.5,
    borderStyle:  'dashed',
    alignItems:   'center',
    justifyContent: 'center',
    gap:          4,
  },
  placeholderText: { fontSize: 11, fontWeight: '500' },

  /* Preview (image selected) */
  previewWrap: {
    width:        100,
    height:       100,
    borderRadius: Theme.radius.lg,
    overflow:     'visible',
  },
  preview: {
    width:        100,
    height:       100,
    borderRadius: Theme.radius.lg,
  },
  changeBtn: {
    position:     'absolute',
    bottom:       -6,
    right:        -6,
    width:        26,
    height:       26,
    borderRadius: 13,
    alignItems:   'center',
    justifyContent: 'center',
    borderWidth:  2,
    borderColor:  '#fff',
  },

  /* Remove button */
  removeBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            6,
    paddingHorizontal: 12,
    paddingVertical:   8,
    borderRadius:   Theme.radius.md,
  },
  removeBtnText: { fontSize: 13, fontWeight: '600' },

  hint: { fontSize: 12, flex: 1, flexWrap: 'wrap' },

  /* Source selection sheet */
  cancelBtn: {
    alignItems:     'center',
    paddingVertical: 14,
    borderTopWidth:  1,
    marginTop:       4,
  },
  cancelText: {
    fontSize:   15,
    fontWeight: '600',
  },
});
