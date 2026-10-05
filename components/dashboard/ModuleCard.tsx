import React, { useRef } from 'react';
import { Pressable, View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useLanguageStore } from '@/store/languageStore';
import i18n from '@/lib/i18n';
import { darken } from '@/lib/colorUtils';
import { ModuleDefinition } from '@/constants/config';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';

interface Props {
  module: ModuleDefinition;
  enabled: boolean;
  label: string;
}

const DEPTH = 5;

function getModuleIcon(id: string): keyof typeof Ionicons.glyphMap {
  switch (id) {
    case 'purchases': return 'cart';
    case 'sales':     return 'receipt';
    case 'inventory': return 'cube';
    case 'reports':   return 'stats-chart';
    case 'history':   return 'time';
    case 'debt':      return 'wallet';
    default:          return 'grid';
  }
}

export function ModuleCard({ module, enabled, label }: Props) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const lang = useLanguageStore((s) => s.language);
  const isKurdish = lang === 'ku' || (!lang && (i18n.language === 'ku' || !i18n.language));

  const pressAnim = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    if (!enabled) return;
    router.push(module.route as any);
  };

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 280,
      friction: 18,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 280,
      friction: 18,
    }).start();
  };

  const translateY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, DEPTH - 1],
  });

  // Uses the exact navigation header gradient colors from the active theme
  const gradColors: [string, string] = [colors.gradientStart, colors.gradientMid];
  const baseBg = darken(colors.gradientStart, 0.16);
  const iconName = getModuleIcon(module.id);

  return (
    <View style={[styles.container, { opacity: enabled ? 1 : 0.5 }]}>
      <Pressable
        onPress={handlePress}
        onPressIn={enabled ? handlePressIn : undefined}
        onPressOut={enabled ? handlePressOut : undefined}
        disabled={!enabled}
        style={styles.pressable}
      >
        {/* 3D Base Card (the visible bottom edge is the 3D bevel/shadow) */}
        <View
          style={[
            styles.baseCard,
            {
              backgroundColor: baseBg,
              shadowColor: baseBg,
            },
          ]}
        >
          {/* Top Surface that sinks down on press */}
          <Animated.View
            style={[
              styles.surfaceWrapper,
              {
                transform: [{ translateY }],
              },
            ]}
          >
            <LinearGradient
              colors={gradColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.surface}
            >
              <View style={styles.contentRow}>
              {isKurdish ? (
                <>
                  <Text
                    style={[styles.label, { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                  >
                    {label}
                  </Text>
                  <Ionicons
                    name={iconName}
                    size={22}
                    color="#FFFFFF"
                    style={styles.iconKurdish}
                  />
                </>
              ) : (
                <>
                  <Ionicons
                    name={iconName}
                    size={22}
                    color="#FFFFFF"
                    style={styles.iconEnglish}
                  />
                  <Text
                    style={styles.label}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                  >
                    {label}
                  </Text>
                </>
              )}
            </View>

            {!enabled && (
              <View style={styles.lockBadge}>
                <Ionicons name="lock-closed" size={11} color="#FFFFFF" />
              </View>
            )}
            </LinearGradient>
          </Animated.View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 7,
  },
  pressable: {
    width: '100%',
  },
  baseCard: {
    borderRadius: 22,
    paddingBottom: DEPTH,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  surfaceWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  surface: {
    minHeight: 102,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  label: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  iconKurdish: {
    marginLeft: 8,
  },
  iconEnglish: {
    marginRight: 8,
  },
  lockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
