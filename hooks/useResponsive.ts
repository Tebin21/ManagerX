import { useWindowDimensions, StyleSheet, ViewStyle } from 'react-native';

export const TABLET_BREAKPOINT = 768;
export const LARGE_TABLET_BREAKPOINT = 1024;

export interface ResponsiveInfo {
  width: number;
  height: number;
  isTablet: boolean;
  isLargeTablet: boolean;
  isLandscape: boolean;
  /** Max content width for readable, balanced tablet presentation */
  contentMaxWidth: number | undefined;
  /** Ready-to-use style to constrain and center screen content on tablets */
  contentContainerStyle: ViewStyle;
  /** Max width for headers to keep buttons reachable on iPad */
  headerMaxWidth: number | undefined;
  /** Header container style centered on tablets */
  headerContainerStyle: ViewStyle;
  /** Recommended column count for Dashboard ModuleGrid (3 on iPad, 2 on phone) */
  moduleColumns: number;
  /** Recommended column count for cards lists (2 on iPad, 1 on phone) */
  cardColumns: number;
  /** Dialog / Sheet max width */
  sheetMaxWidth: number;
  /** Responsive horizontal padding */
  horizontalPadding: number;
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();

  const isTablet = width >= TABLET_BREAKPOINT;
  const isLargeTablet = width >= LARGE_TABLET_BREAKPOINT;
  const isLandscape = width > height;

  const contentMaxWidth = isLargeTablet ? 1100 : (isTablet ? 920 : undefined);
  const headerMaxWidth = isLargeTablet ? 1140 : (isTablet ? 960 : undefined);

  return {
    width,
    height,
    isTablet,
    isLargeTablet,
    isLandscape,
    contentMaxWidth,
    contentContainerStyle: isTablet
      ? {
          width: '100%',
          maxWidth: contentMaxWidth,
          alignSelf: 'center',
        }
      : { width: '100%' },
    headerMaxWidth,
    headerContainerStyle: isTablet
      ? {
          width: '100%',
          maxWidth: headerMaxWidth,
          alignSelf: 'center',
        }
      : { width: '100%' },
    moduleColumns: isTablet ? 3 : 2,
    cardColumns: isTablet ? 2 : 1,
    sheetMaxWidth: isTablet ? 560 : 440,
    horizontalPadding: isLargeTablet ? 32 : (isTablet ? 24 : 16),
  };
}

/**
 * Returns tablet-optimized container style for screens.
 */
export function getResponsiveContainerStyle(width: number): ViewStyle {
  if (width >= LARGE_TABLET_BREAKPOINT) {
    return { width: '100%', maxWidth: 1100, alignSelf: 'center' };
  }
  if (width >= TABLET_BREAKPOINT) {
    return { width: '100%', maxWidth: 920, alignSelf: 'center' };
  }
  return { width: '100%' };
}
