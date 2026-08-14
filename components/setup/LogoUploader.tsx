import React from 'react';
import { TouchableOpacity, Image, View, StyleSheet, Alert, Linking } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { copyToPermanentStorage } from '@/lib/imageStorage';
import { ensureGalleryAccess } from '@/lib/mediaAccess';

interface Props {
  uri: string | null;
  onSelect: (uri: string) => void;
}

export function LogoUploader({ uri, onSelect }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const pick = async () => {
    try {
      const access = await ensureGalleryAccess();
      if (access === 'denied-first-time') return; // respect "Don't Allow" silently — no nag, no Settings redirect
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

      // Lazy import — a static top-level import of expo-image-picker calls a throwing
      // native-module lookup at module-evaluation time (same pattern already used in
      // components/ui/ProductImagePicker.tsx), which would crash app startup instead of
      // just this action if the native module isn't linked in a given build.
      const ImagePicker = await import('expo-image-picker');

      // allowsEditing:true below routes iOS to the legacy UIImagePickerController
      // (not the permission-less PHPickerViewController), which has no built-in
      // authorization check — the request below is required, not optional.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const tempUri = result.assets[0].uri;
        try {
          const permanentUri = await copyToPermanentStorage(tempUri, 'logo_images');
          onSelect(permanentUri);
        } catch (saveErr) {
          console.warn('[LogoUploader] permanent save skipped, using temp URI:', saveErr);
          onSelect(tempUri);
        }
      }
    } catch (err) {
      console.error('[LogoUploader] gallery error:', err);
      Alert.alert(t('common.error'), t('common.tryAgain'));
    }
  };

  return (
    <TouchableOpacity onPress={pick} activeOpacity={0.8} style={styles.wrapper}>
      {uri ? (
        <Image source={{ uri }} style={[styles.image, { borderColor: colors.lightBlue }]} />
      ) : (
        <View style={[styles.placeholder, { backgroundColor: colors.softBlue, borderColor: colors.lightBlue }]}>
          <Ionicons name="camera" size={28} color={colors.primary} />
          <Text style={[styles.hint, { color: colors.primary }]}>Upload Logo</Text>
        </View>
      )}
      <View style={[styles.badge, { backgroundColor: colors.primary }]}>
        <Ionicons name="pencil" size={12} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width:     88,
    height:    88,
    borderRadius: 44,
    overflow:  'visible',
    alignSelf: 'center',
    marginBottom: 8,
  },
  image: {
    width:        88,
    height:       88,
    borderRadius: 44,
    borderWidth:  2,
  },
  placeholder: {
    width:        88,
    height:       88,
    borderRadius: 44,
    borderWidth:  2,
    borderStyle:  'dashed',
    alignItems:   'center',
    justifyContent: 'center',
  },
  hint: {
    fontSize:   10,
    fontWeight: '500',
    marginTop:  2,
  },
  badge: {
    position:     'absolute',
    right:        0,
    bottom:       0,
    width:        24,
    height:       24,
    borderRadius: 12,
    alignItems:   'center',
    justifyContent: 'center',
    borderWidth:  2,
    borderColor:  '#fff',
  },
});
