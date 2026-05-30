import React, { createContext, useContext, useMemo } from 'react';
import { Colors } from '@/constants/colors';
import { DarkColors } from '@/constants/darkColors';
import { useSettingsStore } from '@/store/settingsStore';

export type AppColors = typeof Colors;

export interface AppTheme {
  isDark:  boolean;
  colors:  AppColors;
  toggle:  () => void;
}

const defaultTheme: AppTheme = {
  isDark:  false,
  colors:  Colors,
  toggle:  () => {},
};

export const ThemeContext = createContext<AppTheme>(defaultTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const isDarkMode  = useSettingsStore((s) => s.isDarkMode);
  const setDarkMode = useSettingsStore((s) => s.setDarkMode);

  const theme = useMemo<AppTheme>(
    () => ({
      isDark: isDarkMode,
      colors: isDarkMode ? (DarkColors as unknown as AppColors) : Colors,
      toggle: () => setDarkMode(!isDarkMode),
    }),
    [isDarkMode, setDarkMode]
  );

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Use inside any component to get the current theme colors and dark-mode flag */
export function useAppTheme(): AppTheme {
  return useContext(ThemeContext);
}
