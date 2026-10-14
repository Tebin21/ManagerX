import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL, useDirectionalChevron } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { ModuleDefinition } from '@/constants/config';
import { MODULE_THEMES } from '../ModuleCard';
import { useResponsive } from '@/hooks/useResponsive';
import { hexToRgba } from '@/lib/colorUtils';

interface Props {
  modules: ModuleDefinition[];
}

export function BentoModuleGrid({ modules }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { chevronForward } = useDirectionalChevron();
  const { isTablet } = useResponsive();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  const handlePress = (route: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    router.push(route as never);
  };

  // Bento hierarchy: First 2 modules (usually sales and purchases) are hero cards
  const heroModules = modules.slice(0, 2);
  const regularModules = modules.slice(2);

  return (
    <View style={styles.container}>
      {/* 1. Hero Bento Cards */}
      <View style={styles.heroRow}>
        {heroModules.map((item) => {
          const theme = MODULE_THEMES[item.id] || {
            iconName: 'grid-outline' as const,
            tagKu: 'مۆدیول',
            subtitleKu: 'تۆمارکردن',
            iconColor: colors.primary,
            circleBg: colors.softBlue,
          };

          const title = isKurdish ? theme.tagKu : t(item.labelKey);
          const sub = isKurdish ? theme.subtitleKu : t(item.descriptionKey);

          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => handlePress(item.route)}
              activeOpacity={0.85}
              style={[
                styles.heroCard,
                {
                  width: isTablet ? '48.5%' : '100%',
                  borderColor: isDark ? theme.iconColor + '35' : theme.iconColor + '25',
                },
              ]}
            >
              <LinearGradient
                colors={
                  isDark
                    ? [colors.gray100, hexToRgba(theme.iconColor, 0.12)]
                    : ['#FFFFFF', hexToRgba(theme.iconColor, 0.08)]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.heroGradient, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <View
                  style={[
                    styles.heroIconBox,
                    {
                      backgroundColor: isDark ? hexToRgba(theme.iconColor, 0.22) : theme.circleBg,
                      borderColor: theme.iconColor + '30',
                    },
                  ]}
                >
                  <Ionicons name={theme.iconName} size={28} color={theme.iconColor} />
                </View>

                <View style={[styles.heroTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <View style={[styles.heroBadgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text
                      style={[
                        styles.heroTitle,
                        { color: colors.black, textAlign },
                        isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                    >
                      {title}
                    </Text>
                    <View style={[styles.quickBadge, { backgroundColor: theme.iconColor + '18' }]}>
                      <Text style={[styles.quickBadgeText, { color: theme.iconColor }]}>
                        {isKurdish ? 'سەرەکی' : 'Main'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.heroSub, { color: colors.gray400, textAlign }]}>
                    {sub}
                  </Text>
                </View>

                <Ionicons name={chevronForward as never} size={18} color={theme.iconColor} />
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 2. Secondary Bento Grid (2 columns) */}
      <View style={styles.gridRow}>
        {regularModules.map((item) => {
          const theme = MODULE_THEMES[item.id] || {
            iconName: 'grid-outline' as const,
            tagKu: 'مۆدیول',
            subtitleKu: 'ڕێکخستن',
            iconColor: colors.primary,
            circleBg: colors.softBlue,
          };

          const title = isKurdish ? theme.tagKu : t(item.labelKey);
          const sub = isKurdish ? theme.subtitleKu : t(item.descriptionKey);

          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => handlePress(item.route)}
              activeOpacity={0.82}
              style={[
                styles.gridTile,
                {
                  backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                  borderColor: isDark ? colors.gray200 : '#E2E8F0',
                  width: isTablet ? '31.5%' : '48.5%',
                },
              ]}
            >
              <View style={[styles.tileHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View
                  style={[
                    styles.tileIconBox,
                    {
                      backgroundColor: isDark ? theme.iconColor + '20' : theme.circleBg,
                    },
                  ]}
                >
                  <Ionicons name={theme.iconName} size={20} color={theme.iconColor} />
                </View>
                <View style={[styles.miniDot, { backgroundColor: theme.iconColor }]} />
              </View>

              <Text
                style={[
                  styles.tileTitle,
                  { color: colors.black, textAlign },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>
              <Text
                style={[
                  styles.tileSub,
                  { color: colors.gray400, textAlign },
                ]}
                numberOfLines={1}
              >
                {sub}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 10,
  },
  heroRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  heroGradient: {
    padding: 16,
    alignItems: 'center',
    gap: 14,
  },
  heroIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextCol: {
    flex: 1,
  },
  heroBadgeRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  quickBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  quickBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroSub: {
    fontSize: 12,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    width: '100%',
  },
  gridTile: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tileHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tileIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  tileSub: {
    fontSize: 11,
  },
});
