/**
 * 🛠️ ONBOARDING DESIGN / PREVIEW MODE
 *
 * When TRUE:
 * - App launch directly shows the Splash screen and enters the Onboarding screens.
 * - OnboardingLayout will not bounce you to the dashboard even if logged in.
 * - A discreet "داشبۆرد ⚡" shortcut is available on the onboarding screen for quick access.
 *
 * When FALSE:
 * - App returns to normal production mode (logged-in users go straight to dashboard).
 */
export const DEV_FORCE_ONBOARDING_PREVIEW = false;
