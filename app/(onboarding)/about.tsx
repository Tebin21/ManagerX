import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Legacy About screen replaced by the new unified Onboarding flow in welcome.tsx.
 */
export default function AboutScreen() {
  return <Redirect href="/(onboarding)/welcome" />;
}
