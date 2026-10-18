import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
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
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, 16) + 16 },
        ]}
      >
        {showDashboardNavigation && (
          <BusinessHeader />
        )}

        <View style={[styles.bodyWrapper, isTablet && contentContainerStyle]}>
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 18, delay: 200 }}
            style={[
              styles.sectionHeader,
              { paddingTop: safeTopPadding, paddingBottom: !showDashboardNavigation ? 14 : 10 },
            ]}
          >
            <BexDreLogoButton />

            <TouchableOpacity
              onPress={() => router.push('/(app)/settings' as never)}
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
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 24 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 18, delay: 300 }}
          >
            <ModuleGrid />
          </MotiView>



          <MotiView
            from={{ opacity: 0, translateY: 24 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 18, delay: 420 }}
          >
            <OnlineStoreCard />
          </MotiView>

          <SupportFooter compact />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:  { flex: 1 },
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
