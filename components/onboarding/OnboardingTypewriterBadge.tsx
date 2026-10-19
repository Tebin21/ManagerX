import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/AppText';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { useAppTheme } from '@/contexts/ThemeContext';

interface BadgeTheme {
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  lightBg: string;
  lightBorder: string;
  lightText: string;
  darkBg: string;
  darkBorder: string;
  darkText: string;
}

const BADGE_THEMES: BadgeTheme[] = [
  {
    text: 'بەڕێوەبردنی زیرەک',
    icon: 'sparkles',
    lightBg: '#F0F9FF',
    lightBorder: '#BAE6FD',
    lightText: '#0284C7',
    darkBg: 'rgba(14, 165, 233, 0.12)',
    darkBorder: 'rgba(56, 189, 248, 0.35)',
    darkText: '#38BDF8',
  },
  {
    text: 'فرۆشتنی سەردەمیانە',
    icon: 'cart',
    lightBg: '#F0FDF4',
    lightBorder: '#BBF7D0',
    lightText: '#16A34A',
    darkBg: 'rgba(34, 197, 94, 0.12)',
    darkBorder: 'rgba(74, 222, 128, 0.35)',
    darkText: '#4ADE80',
  },
  {
    text: 'ئەوەی لە مێشکتە لێرەیە',
    icon: 'bulb',
    lightBg: '#FAF5FF',
    lightBorder: '#E9D5FF',
    lightText: '#9333EA',
    darkBg: 'rgba(168, 85, 247, 0.12)',
    darkBorder: 'rgba(192, 132, 252, 0.35)',
    darkText: '#C084FC',
  },
];

const TYPING_SPEED = 70; // ms per char forward
const DELETING_SPEED = 35; // ms per char backward
const HOLD_DURATION = 2200; // ms to hold full phrase
const PAUSE_BEFORE_NEXT = 350; // ms pause after deletion

export const SCREEN_TWO_BADGE_THEMES: BadgeTheme[] = [
  {
    text: 'پێشکەوتووترین سیستەم',
    icon: 'rocket',
    lightBg: '#F0FDF4',
    lightBorder: '#BBF7D0',
    lightText: '#16A34A',
    darkBg: 'rgba(34, 197, 94, 0.12)',
    darkBorder: 'rgba(74, 222, 128, 0.35)',
    darkText: '#4ADE80',
  },
  {
    text: 'خێراترین سیستەم',
    icon: 'flash',
    lightBg: '#FFFBEB',
    lightBorder: '#FDE68A',
    lightText: '#D97706',
    darkBg: 'rgba(245, 158, 11, 0.12)',
    darkBorder: 'rgba(251, 191, 36, 0.35)',
    darkText: '#FBBF24',
  },
  {
    text: 'جوانترین سیستەم',
    icon: 'sparkles',
    lightBg: '#FDF2F8',
    lightBorder: '#FBCFE8',
    lightText: '#DB2777',
    darkBg: 'rgba(236, 72, 153, 0.12)',
    darkBorder: 'rgba(244, 114, 182, 0.35)',
    darkText: '#F472B6',
  },
];

export const SCREEN_THREE_BADGE_THEMES: BadgeTheme[] = [
  {
    text: 'تەواو پارێزراوە',
    icon: 'shield-checkmark',
    lightBg: '#ECFDF5',
    lightBorder: '#A7F3D0',
    lightText: '#059669',
    darkBg: 'rgba(16, 185, 129, 0.12)',
    darkBorder: 'rgba(52, 211, 153, 0.35)',
    darkText: '#34D399',
  },
  {
    text: 'ئۆفلاین و ئۆنلاینە داتاکانت',
    icon: 'cloud-done',
    lightBg: '#EFF6FF',
    lightBorder: '#BFDBFE',
    lightText: '#2563EB',
    darkBg: 'rgba(37, 99, 235, 0.12)',
    darkBorder: 'rgba(96, 165, 250, 0.35)',
    darkText: '#60A5FA',
  },
  {
    text: 'زانیارییەکانت تەنها لای خۆتە',
    icon: 'lock-closed',
    lightBg: '#FEFCE8',
    lightBorder: '#FEF08A',
    lightText: '#CA8A04',
    darkBg: 'rgba(234, 179, 8, 0.12)',
    darkBorder: 'rgba(250, 204, 21, 0.35)',
    darkText: '#FACC15',
  },
];

export const SCREEN_FOUR_BADGE_THEMES: BadgeTheme[] = [
  {
    text: 'ئاسایشی تەواو',
    icon: 'shield-checkmark',
    lightBg: '#ECFDF5',
    lightBorder: '#A7F3D0',
    lightText: '#059669',
    darkBg: 'rgba(16, 185, 129, 0.12)',
    darkBorder: 'rgba(52, 211, 153, 0.35)',
    darkText: '#34D399',
  },
  {
    text: 'خزمەتگوزاریی بەردەوام',
    icon: 'flash',
    lightBg: '#FFFBEB',
    lightBorder: '#FDE68A',
    lightText: '#D97706',
    darkBg: 'rgba(245, 158, 11, 0.12)',
    darkBorder: 'rgba(251, 191, 36, 0.35)',
    darkText: '#FBBF24',
  },
  {
    text: 'پشتگیریی تەواو',
    icon: 'headset',
    lightBg: '#EFF6FF',
    lightBorder: '#BFDBFE',
    lightText: '#2563EB',
    darkBg: 'rgba(37, 99, 235, 0.12)',
    darkBorder: 'rgba(96, 165, 250, 0.35)',
    darkText: '#60A5FA',
  },
];

export const SCREEN_FIVE_BADGE_THEMES: BadgeTheme[] = [
  {
    text: 'بفرۆشە',
    icon: 'cart',
    lightBg: '#ECFDF5',
    lightBorder: '#A7F3D0',
    lightText: '#059669',
    darkBg: 'rgba(16, 185, 129, 0.12)',
    darkBorder: 'rgba(52, 211, 153, 0.35)',
    darkText: '#34D399',
  },
  {
    text: 'بکڕە',
    icon: 'bag-check',
    lightBg: '#EFF6FF',
    lightBorder: '#BFDBFE',
    lightText: '#2563EB',
    darkBg: 'rgba(37, 99, 235, 0.12)',
    darkBorder: 'rgba(96, 165, 250, 0.35)',
    darkText: '#60A5FA',
  },
  {
    text: 'جەرد بکە',
    icon: 'clipboard',
    lightBg: '#FFFBEB',
    lightBorder: '#FDE68A',
    lightText: '#D97706',
    darkBg: 'rgba(245, 158, 11, 0.12)',
    darkBorder: 'rgba(251, 191, 36, 0.35)',
    darkText: '#FBBF24',
  },
];

interface Props {
  style?: object;
  size?: 'normal' | 'large';
  themes?: BadgeTheme[];
}

export function OnboardingTypewriterBadge({ style, size = 'normal', themes = BADGE_THEMES }: Props) {
  const { isDark } = useAppTheme();
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  const isLarge = size === 'large';
  const activeThemes = themes.length > 0 ? themes : BADGE_THEMES;

  // Blinking cursor timer
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  // Main typing engine
  useEffect(() => {
    const currentTheme = activeThemes[phraseIndex % activeThemes.length];
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting) {
      if (displayText.length < currentTheme.text.length) {
        timer = setTimeout(() => {
          setDisplayText(currentTheme.text.slice(0, displayText.length + 1));
        }, TYPING_SPEED);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, HOLD_DURATION);
      }
    } else {
      if (displayText.length > 0) {
        timer = setTimeout(() => {
          setDisplayText(currentTheme.text.slice(0, displayText.length - 1));
        }, DELETING_SPEED);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(false);
          setPhraseIndex((prev) => (prev + 1) % activeThemes.length);
        }, PAUSE_BEFORE_NEXT);
      }
    }

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, phraseIndex, activeThemes]);

  const currentTheme = activeThemes[phraseIndex % activeThemes.length];
  const bgColor = isDark ? currentTheme.darkBg : currentTheme.lightBg;
  const borderColor = isDark ? currentTheme.darkBorder : currentTheme.lightBorder;
  const activeColor = isDark ? currentTheme.darkText : currentTheme.lightText;

  return (
    <View
      style={[
        styles.pillContainer,
        isLarge && styles.pillContainerLarge,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
        },
        style,
      ]}
    >
      <Ionicons
        name={currentTheme.icon}
        size={isLarge ? 22 : 16}
        color={activeColor}
        style={{ marginLeft: isLarge ? 8 : 6 }}
      />
      <View style={[styles.textWrap, isLarge && styles.textWrapLarge]}>
        <Text style={[styles.badgeText, isLarge && styles.badgeTextLarge, { color: activeColor }]}>
          {displayText}
          <Text style={[styles.cursor, isLarge && styles.cursorLarge, { color: activeColor, opacity: cursorVisible ? 1 : 0 }]}>
            {' |'}
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    gap: 6,
    minWidth: 210,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  pillContainerLarge: {
    paddingHorizontal: 26,
    paddingVertical: 12,
    minWidth: 280,
    gap: 8,
    borderWidth: 2,
  },
  textWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 22,
  },
  textWrapLarge: {
    minHeight: 30,
  },
  badgeText: {
    fontSize: 14,
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
    letterSpacing: 0.2,
  },
  badgeTextLarge: {
    fontSize: 18,
    letterSpacing: 0.3,
  },
  cursor: {
    fontSize: 14,
    fontWeight: '900',
  },
  cursorLarge: {
    fontSize: 18,
    fontWeight: '900',
  },
});
