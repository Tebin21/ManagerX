import { Redirect } from 'expo-router';

/**
 * Fallback route for /index.html in static/desktop web environments.
 * Prevents Expo Router from showing the "Unmatched Route" 404 screen.
 */
export default function IndexHtmlFallback() {
  return <Redirect href="/" />;
}
