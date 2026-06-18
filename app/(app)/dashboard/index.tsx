import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { BusinessHeader } from '@/components/dashboard/BusinessHeader';
import { ModuleGrid } from '@/components/dashboard/ModuleGrid';
import { SupportFooter } from '@/components/ui/SupportFooter';
import { useAppTheme } from '@/contexts/ThemeContext';

export default function DashboardScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  return (
    <View style={[styles.screen, { backgroundColor: colors.gray50 }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <BusinessHeader />

        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, delay: 200 }}
          style={styles.sectionHeader}
        >
          <TouchableOpacity
            onPress={() => router.push('/(app)/settings' as never)}
            style={[styles.settingsBtn, { backgroundColor: colors.softBlue, borderColor: colors.primary + '1F' }]}
            hitSlop={8}
          >
            <Ionicons name="settings-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 24 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, delay: 300 }}
        >
          <ModuleGrid />
        </MotiView>

        <SupportFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:  { flex: 1 },
  scroll:  { flexGrow: 1 },
  sectionHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'flex-end',
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
