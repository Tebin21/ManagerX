import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * Global fallback for unmatched routes.
 * Silently redirects to the root screen instead of displaying the Expo Router 404 screen.
 */
export default function NotFoundScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/' as never);
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#D4AF37" />
    </View>
  );
}

