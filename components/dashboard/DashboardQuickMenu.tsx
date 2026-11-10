import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import { useRTL } from '@/lib/rtl';
import { QuickDollarRateModal } from './QuickDollarRateModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function DashboardQuickMenu() {
  const { colors, isDark, toggle } = useAppTheme();
  const { isTablet, isTabletLandscape } = useResponsive();
  const { isRTL } = useRTL();

  const [isOpen, setIsOpen] = useState(false);
  const [dollarModalOpen, setDollarModalOpen] = useState(false);

  const btnSize = isTabletLandscape ? 60 : isTablet ? 52 : 44;
  const btnRadius = isTabletLandscape ? 20 : isTablet ? 16 : 14;
  const iconSize = isTabletLandscape ? 28 : isTablet ? 24 : 20;

  const toggleMenu = () => {
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOpen((prev) => !prev);
  };

  const handleToggleTheme = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggle();
  };

  const handleOpenDollarModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDollarModalOpen(true);
  };

  return (
    <>
      <View
        style={[
          styles.container,
          {
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 8,
          },
        ]}
      >
        {/* Revealed Sub-Actions when Menu is Open */}
        {isOpen && (
          <View
            style={[
              styles.actionsRow,
              {
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                gap: 8,
              },
            ]}
          >
            {/* 1. First Icon: Dark / Light Mode Toggle ("یەکەم ئایکۆن ئایاکۆنی دارکو لایت بێت") */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleToggleTheme}
              style={[
                styles.actionBtn,
                {
                  width: btnSize,
                  height: btnSize,
                  borderRadius: btnRadius,
                  backgroundColor: colors.softBlue,
                  borderColor: colors.primary + '1F',
                },
              ]}
              hitSlop={8}
            >
              <Ionicons
                name={isDark ? 'sunny-outline' : 'moon-outline'}
                size={iconSize}
                color={colors.primary}
              />
            </TouchableOpacity>

            {/* 2. Second Icon: Dollar Exchange Rate ("ئایکۆنی دۆلارەکە با هەر ئایکۆنی دۆلار بێث بە سادیی") */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleOpenDollarModal}
              style={[
                styles.actionBtn,
                {
                  width: btnSize,
                  height: btnSize,
                  borderRadius: btnRadius,
                  backgroundColor: colors.softBlue,
                  borderColor: colors.primary + '1F',
                },
              ]}
              hitSlop={8}
            >
              <Ionicons
                name="logo-usd"
                size={iconSize}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* 3. Main Menu Button (Toggles expand/collapse) */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={toggleMenu}
          style={[
            styles.menuTriggerBtn,
            {
              width: btnSize,
              height: btnSize,
              borderRadius: btnRadius,
              backgroundColor: isOpen
                ? (isDark ? colors.gray200 : '#F1F5F9')
                : colors.softBlue,
              borderColor: isOpen ? colors.primary : colors.primary + '1F',
            },
          ]}
          hitSlop={8}
        >
          <Ionicons
            name={isOpen ? 'close' : 'menu-outline'}
            size={iconSize + 2}
            color={isOpen ? (isDark ? '#FFFFFF' : '#0F172A') : colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Dollar Exchange Rate Modal ("تەبلێ سادە لە ناوەراست") */}
      <QuickDollarRateModal
        visible={dollarModalOpen}
        onClose={() => setDollarModalOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  actionsRow: {
    alignItems: 'center',
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  menuTriggerBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
