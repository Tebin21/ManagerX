import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Root index route for the (app) group.
 * Ensures any navigation to '/(app)' or root group resolution
 * always lands cleanly on the Dashboard instead of glitching or picking an arbitrary child screen.
 */
export default function AppGroupIndex() {
  return <Redirect href="/(app)/dashboard" />;
}
