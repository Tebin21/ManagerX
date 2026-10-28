import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { BexDreLogoButton } from '@/components/dashboard/BexDreLogoButton';
import { BusinessHeader } from '@/components/dashboard/BusinessHeader';
import { ModuleGrid } from '@/components/dashboard/ModuleGrid';

import { OnlineStoreCard } from '@/components/dashboard/OnlineStoreCard';
import { SupportFooter } from '@/components/ui/SupportFooter';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import { useModuleStore } from '@/store/moduleStore';

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const { isTablet, isTabletLandscape, contentContainerStyle } = useResponsive();
  const showDashboardNavigation = useModuleStore((s) => s.showDashboardNavigation ?? true);

  // When the business header is hidden, ensure proper breathing space below the status bar / Dynamic Island
  const safeTopPadding = !showDashboardNavigation ? Math.max(insets.top, 16) + 12 : 10;

  return (
    <View style={[styles.screen, { backgroundColor: colors.gray50 }]}>
      <StatusBar barStyle={showDashboardNavigation ? 'light-content' : (isDark ? 'light-content' : 'dark-content')} />

      {/* Top Banner Header (Fixed at top, not inside the ScrollView) */}
      {showDashboardNavigation && (
        <View style={styles.headerFixedWrapper}>
          <BusinessHeader />
        </View>
      )}

      {/* Scrollable Content (Logo, Settings, Modules and Store scroll under BusinessHeader) */}
      <ScrollView
        style={styles.scrollFlex}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        removeClippedSubviews={Platform.OS === 'android'}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, 16) + 16 },
        ]}
      >
        <View style={[styles.bodyWrapper, isTablet && contentContainerStyle]}>
          {/* Top Bar with BexDre Logo & Settings Button */}
          <View
            style={[
              styles.sectionHeader,
              { paddingTop: safeTopPadding, paddingBottom: 10 },
            ]}
          >
            <BexDreLogoButton />

            <TouchableOpacity
              onPress={() => router.push('/(app)/settings' as never)}
              activeOpacity={0.7}
              style={[
                styles.settingsBtn,
                {
                  backgroundColor: colors.softBlue,
                  borderColor: colors.primary + '1F',
                  width: isTabletLandscape ? 60 : isTablet ? 52 : 44,
                  height: isTabletLandscape ? 60 : isTablet ? 52 : 44,
                  borderRadius: isTabletLandscape ? 20 : isTablet ? 16 : 14,
                },
              ]}
              hitSlop={8}
            >
              <Ionicons name="settings-outline" size={isTabletLandscape ? 32 : isTablet ? 28 : 22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ModuleGrid />

          <OnlineStoreCard />

          <SupportFooter compact />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:  { flex: 1 },
  headerFixedWrapper: {
    zIndex: 10,
    elevation: 8,
  },
  scrollFlex: { flex: 1 },
  scroll:  { flexGrow: 1 },
  bodyWrapper: {
    width: '100%',
  },
  sectionHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical:   10,
  },
  settingsBtn: {
    width:          44,
    height:         44,
    borderRadius:   14,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
  },
});
