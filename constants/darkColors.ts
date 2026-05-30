// Dark mode palette — same shape as Colors so it can drop in as a replacement
export const DarkColors = {
  white: '#0F172A',       // inverted: dark backgrounds
  black: '#F1F5F9',       // inverted: light text

  // Blue gradient — slightly deeper in dark mode
  gradientStart: '#1E3A8A',
  gradientMid:   '#1E40AF',
  gradientEnd:   '#2563EB',

  // Primary blues — same, blue works in both modes
  primary:     '#60A5FA',
  primaryDark: '#3B82F6',
  darkBlue:    '#93C5FD',
  navyBlue:    '#BFDBFE',

  // Soft blues — inverted to dark backgrounds with blue tint
  softBlue:   '#1E3A8A22',
  lightBlue:  '#1E40AF33',
  mediumBlue: '#2563EB44',
  skyBlue:    '#3B82F655',

  // Grays — fully inverted scale
  gray50:  '#0F172A',   // darkest background
  gray100: '#1E293B',   // card background
  gray200: '#334155',   // borders
  gray300: '#475569',   // muted borders
  gray400: '#64748B',   // placeholder text
  gray500: '#94A3B8',   // secondary text
  gray600: '#CBD5E1',   // primary text secondary
  gray700: '#E2E8F0',   // primary text

  // Semantic — keep the same semantic meaning, slightly adjusted for dark
  success: '#34D399',
  warning: '#FBBF24',
  error:   '#F87171',
  info:    '#60A5FA',
} as const;
