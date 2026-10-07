import { useWindowDimensions, Platform, StyleSheet, ViewStyle } from 'react-native';

export const TABLET_BREAKPOINT = 700;
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
  /** Tablet touch & button height tokens */
  buttonHeight: number;
  buttonFontSize: number;
  inputHeight: number;
  headerButtonSize: number;
  headerIconSize: number;
  moduleCardHeight: number;
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();

  // On iOS, check Platform.isPad first to reliably catch all iPad models
  // (iPad Mini 744pt, iPad 10.2", iPad Air, iPad Pro) and iPad Split View.
  // On Android, width >= 640 identifies 7"-10" tablets.
  const isTablet =
    Platform.OS === 'ios'
      ? Boolean(Platform.isPad) || width >= TABLET_BREAKPOINT
      : width >= 640;

  const maxDimension = Math.max(width, height);
  const isLargeTablet = isTablet && maxDimension >= LARGE_TABLET_BREAKPOINT;
  const isLandscape = width > height;

  const contentMaxWidth = isLargeTablet ? 1160 : (isTablet ? 980 : undefined);
  const headerMaxWidth = isLargeTablet ? 1200 : (isTablet ? 1020 : undefined);

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
    sheetMaxWidth: isTablet ? 600 : 440,
    horizontalPadding: isLargeTablet ? 32 : (isTablet ? 24 : 16),
    buttonHeight: isTablet ? 60 : 52,
    buttonFontSize: isTablet ? 18 : 16,
    inputHeight: isTablet ? 58 : 52,
    headerButtonSize: isTablet ? 44 : 36,
    headerIconSize: isTablet ? 24 : 20,
    moduleCardHeight: isLargeTablet ? 150 : (isTablet ? 138 : 102),
  };
}

/**
 * Returns tablet-optimized container style for screens.
 */
export function getResponsiveContainerStyle(width: number): ViewStyle {
  if (width >= LARGE_TABLET_BREAKPOINT) {
    return { width: '100%', maxWidth: 1160, alignSelf: 'center' };
  }
  if (width >= TABLET_BREAKPOINT) {
    return { width: '100%', maxWidth: 980, alignSelf: 'center' };
  }
  return { width: '100%' };
}
