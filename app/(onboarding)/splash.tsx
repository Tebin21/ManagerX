import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SplashAnimation } from '@/components/splash/SplashAnimation';
import { useAppTheme } from '@/contexts/ThemeContext';

export default function SplashScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(onboarding)/login');
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <SplashAnimation />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
