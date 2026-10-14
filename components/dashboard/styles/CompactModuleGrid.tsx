import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { ModuleDefinition } from '@/constants/config';
import { MODULE_THEMES } from '../ModuleCard';

interface Props {
  modules: ModuleDefinition[];
}

export function CompactModuleGrid({ modules }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  const handlePress = (route: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    router.push(route as never);
  };

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
          borderColor: isDark ? colors.gray200 : '#E2E8F0',
        },
      ]}
    >
      <View style={styles.grid}>
        {modules.map((item) => {
          const theme = MODULE_THEMES[item.id] || {
            iconName: 'grid-outline' as const,
            tagKu: 'مۆدیول',
            iconColor: colors.primary,
          };

          const title = isKurdish ? theme.tagKu : t(item.labelKey);

          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => handlePress(item.route)}
              activeOpacity={0.7}
              style={styles.appItem}
            >
              <View
                style={[
                  styles.squircle,
                  {
                    backgroundColor: theme.iconColor,
                    shadowColor: theme.iconColor,
                  },
                ]}
              >
                <Ionicons name={theme.iconName} size={25} color="#FFFFFF" />
              </View>

              <Text
                style={[
                  styles.label,
                  { color: colors.black },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 8,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    rowGap: 16,
    width: '100%',
  },
  appItem: {
    width: '25%',
    alignItems: 'center',
    gap: 6,
  },
  squircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
