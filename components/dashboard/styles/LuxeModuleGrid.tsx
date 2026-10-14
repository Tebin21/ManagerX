import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { ModuleDefinition } from '@/constants/config';
import { MODULE_THEMES } from '../ModuleCard';
import { useResponsive } from '@/hooks/useResponsive';
import { hexToRgba } from '@/lib/colorUtils';

interface Props {
  modules: ModuleDefinition[];
}

export function LuxeModuleGrid({ modules }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { isTablet } = useResponsive();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  const handlePress = (route: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {}
    router.push(route as never);
  };

  const goldAccent = '#D4AF37';

  return (
    <View style={styles.grid}>
      {modules.map((item) => {
        const theme = MODULE_THEMES[item.id] || {
          iconName: 'grid-outline' as const,
          tagKu: 'مۆدیول',
          subtitleKu: 'تایبەتمەندی',
          iconColor: goldAccent,
        };

        const title = isKurdish ? theme.tagKu : t(item.labelKey);
        const sub = isKurdish ? theme.subtitleKu : t(item.descriptionKey);

        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => handlePress(item.route)}
            activeOpacity={0.85}
            style={[
              styles.card,
              {
                width: isTablet ? '48.5%' : '48.5%',
                borderColor: isDark ? '#D4AF3750' : '#D4AF3740',
              },
            ]}
          >
            <LinearGradient
              colors={
                isDark
                  ? ['#1E293B', '#1E293BEE', hexToRgba(goldAccent, 0.08)]
                  : ['#FFFFFF', '#FAF8F0', hexToRgba(goldAccent, 0.06)]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              {/* Header: Gold chip & Star */}
              <View style={[styles.topRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.goldPill, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="sparkles" size={10} color={goldAccent} />
                  <Text style={styles.goldPillText}>{title}</Text>
                </View>
                <View style={[styles.goldRingIcon, { borderColor: hexToRgba(theme.iconColor, 0.35) }]}>
                  <Ionicons name={theme.iconName} size={18} color={theme.iconColor} />
                </View>
              </View>

              {/* Title & Description */}
              <View style={[styles.bottomCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text
                  style={[
                    styles.title,
                    { color: colors.black, textAlign },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
                <Text
                  style={[
                    styles.sub,
                    { color: colors.gray400, textAlign },
                  ]}
                  numberOfLines={1}
                >
                  {sub}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    width: '100%',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  cardGradient: {
    padding: 14,
    justifyContent: 'space-between',
    minHeight: 110,
  },
  topRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  goldPill: {
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D4AF3718',
    borderColor: '#D4AF3735',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  goldPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#D4AF37',
  },
  goldRingIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomCol: {
    width: '100%',
  },
  title: {
    fontSize: 14.5,
    fontWeight: '800',
    marginBottom: 2,
  },
  sub: {
    fontSize: 11,
    lineHeight: 15,
  },
});
