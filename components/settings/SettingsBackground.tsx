import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/contexts/ThemeContext';

export function SettingsBackground({ children }: { children?: React.ReactNode }) {
  const { isDark } = useAppTheme();
  if (Platform.OS !== 'ios') return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <LinearGradient
        colors={
          isDark
            ? ['#0B1120', '#0F172A', '#131D31']
            : ['#F6F8FB', '#EDF2F7', '#F1F4F9']
        }
        style={StyleSheet.absoluteFillObject}
      />
      {/* Subtle warm Froshiar gold ambient light orb */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(212, 175, 55, 0.12)', 'rgba(212, 175, 55, 0.02)', 'transparent']
            : ['rgba(212, 175, 55, 0.16)', 'rgba(212, 175, 55, 0.03)', 'transparent']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 0.8 }}
        style={styles.ambientOrbTop}
      />
      {/* Subtle cool azure/indigo ambient orb */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(59, 130, 246, 0.10)', 'rgba(99, 102, 241, 0.02)', 'transparent']
            : ['rgba(59, 130, 246, 0.12)', 'rgba(99, 102, 241, 0.02)', 'transparent']
        }
        start={{ x: 1, y: 0.2 }}
        end={{ x: 0.1, y: 1 }}
        style={styles.ambientOrbMid}
      />
      {/* Subtle bottom orb */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(139, 92, 246, 0.07)', 'transparent']
            : ['rgba(139, 92, 246, 0.08)', 'transparent']
        }
        start={{ x: 0.2, y: 1 }}
        end={{ x: 1, y: 0.2 }}
        style={styles.ambientOrbBottom}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  ambientOrbTop: {
    position: 'absolute',
    top: 50,
    left: -60,
    width: 340,
    height: 340,
    borderRadius: 170,
  },
  ambientOrbMid: {
    position: 'absolute',
    top: 380,
    right: -60,
    width: 360,
    height: 360,
    borderRadius: 180,
  },
  ambientOrbBottom: {
    position: 'absolute',
    bottom: 20,
    left: -40,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
});
