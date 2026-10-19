import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Legacy Language screen replaced by the default Kurdish onboarding flow.
 */
export default function LanguageScreen() {
  return <Redirect href="/(onboarding)/welcome" />;
}
