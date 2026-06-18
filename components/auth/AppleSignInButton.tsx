import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useRTL } from '@/lib/rtl';

// UI only — Apple Sign-In is not implemented yet, so this renders as a
// disabled "coming soon" button with no press handler.
export function AppleSignInButton() {
  const { t } = useTranslation();
  const { isRTL } = useRTL();

  return (
    <View style={styles.button}>
      <View style={styles.inner}>
        <Ionicons name="logo-apple" size={22} color={Colors.gray400} />
        <Text style={styles.label}>{t('login.appleBtn')}</Text>
      </View>
      <View style={[styles.badge, isRTL ? styles.badgeLeft : styles.badgeRight]}>
        <Text style={styles.badgeText}>{t('common.comingSoon')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: Theme.button.height,
    borderRadius: Theme.button.borderRadius,
    backgroundColor: Colors.gray100,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    justifyContent: 'center',
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 12,
    opacity: 0.55,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.gray500,
    letterSpacing: 0.2,
  },
  badge: {
    position: 'absolute',
    top: -10,
    backgroundColor: Colors.gray500,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeRight: { right: 14 },
  badgeLeft: { left: 14 },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
