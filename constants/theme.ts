import { Colors } from './colors';

export const Theme = {
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    card: 20,
    xl: 24,
    full: 999,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  shadow: {
    card: {
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 16,
      elevation: 6,
    },
    soft: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    button: {
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 8,
      elevation: 5,
    },
  },

  button: {
    height: 52,
    borderRadius: 14,
  },

  input: {
    height: 52,
    borderRadius: 12,
  },
} as const;
