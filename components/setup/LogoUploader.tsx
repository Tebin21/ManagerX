import React from 'react';
import { TouchableOpacity, Image, View, StyleSheet, Alert, Linking } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { copyToPermanentStorage } from '@/lib/imageStorage';
import { ensureGalleryAccess } from '@/lib/mediaAccess';

import { useResponsive } from '@/hooks/useResponsive';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';

interface Props {
  uri: string | null;
  onSelect: (uri: string) => void;
  size?: number;
}

export function LogoUploader({ uri, onSelect, size }: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isTablet } = useResponsive();

  const finalSize = size ?? (isTablet ? 136 : 88);
  const radius = finalSize / 2;
  const cameraIconSize = Math.round(finalSize * 0.32);
  const badgeSize = Math.round(finalSize * 0.28);
  const pencilIconSize = Math.round(badgeSize * 0.52);

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
    <TouchableOpacity
      onPress={pick}
      activeOpacity={0.8}
      style={[
        styles.wrapper,
        {
          width: finalSize,
          height: finalSize,
          borderRadius: radius,
        },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.image,
            {
              width: finalSize,
              height: finalSize,
              borderRadius: radius,
              borderColor: colors.lightBlue,
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: finalSize,
              height: finalSize,
              borderRadius: radius,
              backgroundColor: colors.softBlue,
              borderColor: colors.lightBlue,
            },
          ]}
        >
          <Ionicons name="camera" size={cameraIconSize} color={colors.primary} />
          <Text
            style={[
              styles.hint,
              {
                color: colors.primary,
                fontSize: finalSize > 100 ? 13 : 10,
                fontFamily: SETTINGS_KURDISH_FONT_BOLD,
              },
            ]}
          >
            Upload Logo
          </Text>
        </View>
      )}
      <View
        style={[
          styles.badge,
          {
            backgroundColor: colors.primary,
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            borderColor: isDark ? '#1E293B' : '#FFFFFF',
          },
        ]}
      >
        <Ionicons name="pencil" size={pencilIconSize} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'visible',
    alignSelf: 'center',
    marginBottom: 8,
  },
  image: {
    borderWidth: 2.5,
  },
  placeholder: {
    borderWidth: 2.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontWeight: '600',
    marginTop: 4,
  },
  badge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
});
