import React from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { Colors } from '@/constants/colors';
import { MODAL_SUPPORTED_ORIENTATIONS } from '@/constants/theme';
import { SUPPORT_PHONE } from '@/constants/config';
import { useUsageLimitModalStore } from '@/store/usageLimitModalStore';
import { useLanguageStore } from '@/store/languageStore';

export function UsageLimitModal() {
  const { visible, message, closeModal } = useUsageLimitModalStore();
  const { colors, isDark } = useAppTheme();
  const { flexDirection } = useRTL();
  const language = useLanguageStore((s) => s.language);
  const isKu = language === 'ku';

  if (!visible) return null;

  const handleContactSupport = async () => {
    try {
      const url = `tel:${SUPPORT_PHONE}`;
      const canOpen = await Linking.canOpenURL(url).catch(() => false);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          isKu ? 'پەیوەندی بە سەپۆرتەوە' : 'Support Contact',
          `${isKu ? 'ژمارەی مۆبایل: ' : 'Phone: '}${SUPPORT_PHONE}`
        );
      }
    } catch {
      Alert.alert(
        isKu ? 'پەیوەندی بە سەپۆرتەوە' : 'Support Contact',
        `${isKu ? 'ژمارەی مۆبایل: ' : 'Phone: '}${SUPPORT_PHONE}`
      );
    }
  };

  const titleText = isKu ? 'سنووری بەکارهێنان تەواو بووە' : 'Usage Limit Reached';
  const buttonText = isKu ? 'تکایە پەیوەندی بە سەپۆرتەوە بکە' : 'Please contact support';
  const closeText = isKu ? 'داخستن' : 'Close';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={closeModal}
      statusBarTranslucent
      supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: isDark ? colors.gray100 : Colors.white,
              borderColor: isDark ? colors.gray200 : 'rgba(212, 175, 55, 0.25)',
              borderWidth: 1,
            },
          ]}
        >
          {/* Top Decorative Icon */}
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: isDark ? 'rgba(212, 175, 55, 0.14)' : '#FFFBEB',
                borderColor: colors.primary,
              },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={34} color={colors.primary} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.black }]}>
            {titleText}
          </Text>

          {/* Optional Message or Short Subtitle */}
          {message ? (
            <Text style={[styles.description, { color: colors.gray500 }]}>
              {message}
            </Text>
          ) : (
            <Text style={[styles.description, { color: colors.gray500 }]}>
              {isKu
                ? 'گەیشتوویتەتە سنووری دیاریکراوی بەکارهێنان لەم وەشانەدا.'
                : 'You have reached the system usage limit for this version.'}
            </Text>
          )}

          {/* Primary Action Button: Contact Support */}
          <TouchableOpacity
            style={[
              styles.supportBtn,
              {
                backgroundColor: colors.primary,
                flexDirection,
              },
            ]}
            onPress={handleContactSupport}
            activeOpacity={0.85}
          >
            <Ionicons name="call" size={18} color="#FFFFFF" />
            <Text style={styles.supportBtnText}>
              {buttonText}
            </Text>
          </TouchableOpacity>

          {/* Secondary Close Button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={closeModal}
            activeOpacity={0.7}
          >
            <Text style={[styles.closeBtnText, { color: colors.gray500 }]}>
              {closeText}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 22,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 14,
  },
  iconWrapper: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  supportBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 10,
  },
  supportBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  closeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

