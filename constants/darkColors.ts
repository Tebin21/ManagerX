// Dark mode palette — same shape as Colors so it can drop in as a replacement
export const DarkColors = {
  white: '#0F172A',       // inverted: dark backgrounds
  black: '#F1F5F9',       // inverted: light text

  // Gold gradient — same hue/saturation as light mode
  gradientStart: '#725D18',
  gradientMid:   '#D4AF37',
  gradientEnd:   '#E4CD81',

  // Primary gold — lightened for dark-mode contrast
  primary:     '#D4AF37',
  primaryDark: '#A88924',
  darkBlue:    '#E6D089',
  navyBlue:    '#F3E9C8',

  // Soft gold — inverted to dark backgrounds with gold tint
  softBlue:   '#725D1822',
  lightBlue:  '#D4AF3733',
  mediumBlue: '#E4CD8144',
  skyBlue:    '#A8892455',

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
  info:    '#D4AF37',
} as const;
