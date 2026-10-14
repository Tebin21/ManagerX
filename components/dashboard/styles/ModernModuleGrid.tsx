import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
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

interface Props {
  modules: ModuleDefinition[];
}

export function ModernModuleGrid({ modules }: Props) {
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

  return (
    <View style={styles.grid}>
      {modules.map((item) => {
        const theme = MODULE_THEMES[item.id] || {
          iconName: 'grid-outline' as const,
          tagKu: 'مۆدیول',
          subtitleKu: 'بەڕێوەبردن',
          iconColor: colors.primary,
          circleBg: colors.softBlue,
        };

        const title = isKurdish ? theme.tagKu : t(item.labelKey);
        const sub = isKurdish ? theme.subtitleKu : t(item.descriptionKey);

        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => handlePress(item.route)}
            activeOpacity={0.8}
            style={[
              styles.card,
              {
                backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                borderColor: isDark ? colors.gray200 : '#E2E8F0',
                flexDirection: isRTL ? 'row-reverse' : 'row',
                width: isTablet ? '48.5%' : '48.5%',
              },
            ]}
          >
            {/* Color accent strip on leading edge */}
            <View
              style={[
                styles.accentStrip,
                {
                  backgroundColor: theme.iconColor,
                  [isRTL ? 'right' : 'left']: 0,
                },
              ]}
            />

            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: isDark ? theme.iconColor + '22' : theme.circleBg,
                },
              ]}
            >
              <Ionicons name={theme.iconName} size={isTablet ? 22 : 19} color={theme.iconColor} />
            </View>

            <View style={[styles.textCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
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

            <Ionicons
              name={chevronForward as never}
              size={14}
              color={colors.gray300}
              style={{ opacity: 0.6 }}
            />
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
    position: 'relative',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  accentStrip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  sub: {
    fontSize: 10.5,
    lineHeight: 14,
  },
});
