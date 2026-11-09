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
                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
                  borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : '#FDE68A',
                },
              ]}
              hitSlop={8}
            >
              <Ionicons
                name={isDark ? 'sunny' : 'moon'}
                size={iconSize}
                color={isDark ? '#FBBF24' : '#4F46E5'}
              />
            </TouchableOpacity>

            {/* 2. Second Icon: Dollar Exchange Rate ("دووم ئایکۆن ئایکۆنی دۆلار بێت") */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleOpenDollarModal}
              style={[
                styles.actionBtn,
                {
                  width: btnSize,
                  height: btnSize,
                  borderRadius: btnRadius,
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0',
                },
              ]}
              hitSlop={8}
            >
              <Ionicons
                name="cash-outline"
                size={iconSize}
                color={isDark ? '#34D399' : '#059669'}
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
    borderWidth: 1.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuTriggerBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
