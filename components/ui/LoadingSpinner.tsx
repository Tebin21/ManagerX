import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MotiView } from 'moti';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import i18n from '@/lib/i18n';

interface Props {
  size?: number;
  color?: string;
  message?: string;
  showMessage?: boolean;
  flex?: boolean;
}

export function LoadingSpinner({
  size = 40,
  color,
  message,
  showMessage = true,
  flex = false,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const lang = useLanguageStore((s) => s.language);
  const isKurdish = lang === 'ku' || (!lang && (i18n.language === 'ku' || !i18n.language));
  const spinnerColor = color ?? colors.primary;

  const displayMessage = message ?? (t('common.pleaseWait') || 'چاوەڕێ بە...');

  return (
    <View style={[styles.container, flex && styles.flexContainer]}>
      <MotiView
        from={{ rotate: '0deg' }}
        animate={{ rotate: '360deg' }}
        transition={{ type: 'timing', duration: 800, loop: true, repeatReverse: false }}
        style={[
          styles.spinner,
          {
            width:        size,
            height:       size,
            borderRadius: size / 2,
            borderColor:  spinnerColor,
          },
        ]}
      />
      {showMessage && (
        <Text
          style={[
            styles.message,
            { color: isDark ? '#F8FAFC' : '#0F172A' },
            isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
          ]}
        >
          {displayMessage}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  flexContainer: {
    flex: 1,
  },
  spinner: {
    borderWidth:     3,
    borderTopColor: 'transparent',
  },
  message: {
    marginTop: 12,
    fontSize: 14.5,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
