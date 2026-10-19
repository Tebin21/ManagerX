import React, { useRef, useEffect } from 'react';
import { ScrollView, TouchableOpacity, View, StyleSheet, TextStyle } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { BUSINESS_TYPES } from '@/constants/config';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { useTranslation } from 'react-i18next';
import { Theme } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { hexToRgba } from '@/lib/colorUtils';
import { SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  inputLabelStyle?: TextStyle;
  inputStyle?: TextStyle;
}

export function BusinessTypeSelector({
  value,
  onChangeText,
  error,
  inputLabelStyle,
  inputStyle,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign } = useRTL();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');
  const { t } = useTranslation();
  const { isTablet, isTabletLandscape } = useResponsive();
  const scrollRef = useRef<ScrollView>(null);
  const initialScrollDone = useRef(false);

  useEffect(() => {
    initialScrollDone.current = false;
  }, [isRTL]);

  const getLabel = (bt: { id: string; label: string; labelKu?: string }) => {
    if (isKurdish) return bt.labelKu ?? bt.label;
    return bt.label;
  };

  // If the stored value is a predefined chip id, show the human-readable label in the
  // text input. Free-form typed text is shown as-is.
  const predefined = BUSINESS_TYPES.find((bt) => bt.id === value);
  const displayValue = predefined ? getLabel(predefined) : value;

  const handleContentSizeChange = () => {
    if (isRTL && !initialScrollDone.current) {
      initialScrollDone.current = true;
      scrollRef.current?.scrollToEnd({ animated: false });
    }
  };

  const handleSelect = (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    onChangeText(id);
  };

  const renderChip = (type: (typeof BUSINESS_TYPES)[number], inGrid: boolean) => {
    const isActive = value === type.id;
    const chipLabel = getLabel(type);

    return (
      <TouchableOpacity
        key={type.id}
        onPress={() => handleSelect(type.id)}
        activeOpacity={0.75}
        style={inGrid ? { flex: 1 } : undefined}
      >
        <MotiView
          animate={{
            borderColor: isActive ? colors.primary : isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
            backgroundColor: isActive
              ? hexToRgba(colors.primary, isDark ? 0.22 : 0.12)
              : isDark
              ? 'rgba(30, 41, 59, 0.65)'
              : '#F8FAFC',
            scale: isActive ? 1.02 : 1,
          }}
          transition={{ type: 'spring', damping: 18, stiffness: 220 }}
          style={[
            styles.chip,
            inGrid && [
              styles.gridChip,
              {
                minHeight: isTabletLandscape ? 96 : 84,
                paddingVertical: isTabletLandscape ? 14 : 12,
              },
            ],
            isActive && {
              shadowColor: colors.primary,
              shadowOpacity: isDark ? 0.35 : 0.18,
              shadowOffset: { width: 0, height: 3 },
              shadowRadius: 6,
              elevation: 4,
            },
          ]}
        >
          {isActive && (
            <View
              style={[
                styles.activeBadge,
                {
                  backgroundColor: colors.primary,
                  borderColor: isDark ? '#1E293B' : '#FFFFFF',
                },
              ]}
            >
              <Ionicons name="checkmark" size={10} color="#FFFFFF" />
            </View>
          )}
          <Text
            style={[
              styles.chipEmoji,
              inGrid && { fontSize: isTabletLandscape ? 30 : 26, marginBottom: 5 },
            ]}
          >
            {type.emoji}
          </Text>
          <Text
            style={[
              styles.chipLabel,
              inGrid && {
                fontSize: isTabletLandscape ? 14 : 12.5,
                lineHeight: isTabletLandscape ? 20 : 18,
              },
              {
                color: isActive ? (isDark ? colors.primary : colors.black) : colors.gray600,
                textAlign: 'center',
                fontFamily: isKurdish
                  ? isActive
                    ? SETTINGS_KURDISH_FONT_BOLD
                    : SETTINGS_KURDISH_FONT
                  : undefined,
              },
              isActive && styles.chipLabelActive,
            ]}
            numberOfLines={1}
          >
            {chipLabel}
          </Text>
        </MotiView>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrapper}>
      <AppTextInput
        label={t('setup.businessType')}
        placeholder={t('setup.businessTypePlaceholder')}
        value={displayValue}
        onChangeText={onChangeText}
        error={error}
        autoCorrect={false}
        autoCapitalize="words"
        labelStyle={inputLabelStyle}
        style={inputStyle}
      />

      {isTablet ? (
        /* Tablet: Spacious 5-column grid across 2 rows */
        <View style={styles.gridContainer}>
          <View style={[styles.gridRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {BUSINESS_TYPES.slice(0, 5).map((type) => renderChip(type, true))}
          </View>
          <View style={[styles.gridRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {BUSINESS_TYPES.slice(5, 10).map((type) => renderChip(type, true))}
          </View>
        </View>
      ) : (
        /* Phone: Horizontal scrolling chip list */
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.chips,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={handleContentSizeChange}
        >
          {BUSINESS_TYPES.map((type) => renderChip(type, false))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  gridContainer: {
    marginTop: 2,
    gap: 12,
  },
  gridRow: {
    width: '100%',
    gap: 12,
  },
  gridChip: {
    minWidth: 0,
    width: '100%',
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1.8,
  },
  chips: {
    paddingVertical: 4,
    gap: 8,
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: Theme.radius.lg,
    borderWidth: 1.5,
    minWidth: 92,
    position: 'relative',
    ...Theme.shadow.soft,
  },
  activeBadge: {
    position: 'absolute',
    top: 6,
    end: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  chipLabel: {
    fontSize: 11.5,
    fontWeight: '500',
    textAlign: 'center',
  },
  chipLabelActive: {
    fontWeight: '700',
  },
});
