import { useWindowDimensions, Platform, StyleSheet, ViewStyle } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';
import { getScaleFactor, getScaleInfo, DEFAULT_SCALE_LEVEL } from '@/constants/scale';

export const TABLET_BREAKPOINT = 700;
export const LARGE_TABLET_BREAKPOINT = 1024;
export const JUMBO_TABLET_BREAKPOINT = 1280;

export interface ResponsiveInfo {
  width: number;
  height: number;
  isTablet: boolean;
  isLargeTablet: boolean;
  isLandscape: boolean;
  /** True when device is a tablet and currently in landscape orientation */
  isTabletLandscape: boolean;
  /** Max content width for readable, balanced tablet presentation */
  contentMaxWidth: number | undefined;
  /** Ready-to-use style to constrain and center screen content on tablets */
  contentContainerStyle: ViewStyle;
  /** Max width for headers to keep buttons reachable on iPad */
  headerMaxWidth: number | undefined;
  /** Header container style centered on tablets */
  headerContainerStyle: ViewStyle;
  /** Recommended column count for Dashboard ModuleGrid (4 on landscape iPad, 3 on portrait iPad, 2 on phone) */
  moduleColumns: number;
  /** Recommended column count for cards lists (3-4 on landscape iPad, 2 on portrait iPad, 1 on phone) */
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

  // --- Large Screen Sizing Tokens ---
  /** Sizing scale factor for fonts (1.0 on phone, ~1.18 on iPad, ~1.28 on iPad landscape) */
  fontScale: number;
  /** Sizing scale factor for icons (1.0 on phone, ~1.22 on iPad, ~1.35 on iPad landscape) */
  iconScale: number;
  /** Squircle icon button dimensions for Compact dashboard and similar grids */
  squircleSize: number;
  /** Inner icon size for squircles */
  squircleIconSize: number;
  /** Item title font size */
  titleFontSize: number;
  /** Card padding */
  cardPadding: number;
  /** POS Dual-pane layout enabled (e.g. products on left, cart on right on iPad landscape) */
  isDualPane: boolean;

  // --- Dynamic System Scaling (1-10 levels) ---
  /** Current app UI scaling multiplier (0.78 - 1.35) */
  uiScaleFactor: number;
  /** Current app UI scaling level (1 - 10) */
  uiScaleLevel: number;
  /** Scale percentage (e.g. 100) */
  uiScalePercent: number;
  /** Scale label in Kurdish */
  uiScaleLabelKu: string;
  /** Scale label in English */
  uiScaleLabelEn: string;
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  const appScaleLevel = useSettingsStore((s) => s.appScaleLevel ?? DEFAULT_SCALE_LEVEL);
  const scaleMultiplier = getScaleFactor(appScaleLevel);
  const scaleInfo = getScaleInfo(appScaleLevel);

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
  const isTabletLandscape = isTablet && isLandscape;

  // Expand max content width on iPad landscape so the canvas is generous and well-used
  let contentMaxWidth: number | undefined = undefined;
  let headerMaxWidth: number | undefined = undefined;

  if (isTablet) {
    if (isTabletLandscape) {
      contentMaxWidth = width >= JUMBO_TABLET_BREAKPOINT ? 1340 : 1220;
      headerMaxWidth = width >= JUMBO_TABLET_BREAKPOINT ? 1360 : 1240;
    } else {
      contentMaxWidth = isLargeTablet ? 1160 : 980;
      headerMaxWidth = isLargeTablet ? 1200 : 1020;
    }
  }

  // Sizing tokens tailored for iPad touch ergonomics, high-resolution displays, and user-selected UI Scale
  const baseFontScale = isTabletLandscape ? 1.40 : isTablet ? 1.28 : 1.0;
  const fontScale = Number((baseFontScale * scaleMultiplier).toFixed(2));

  const baseIconScale = isTabletLandscape ? 1.48 : isTablet ? 1.32 : 1.0;
  const iconScale = Number((baseIconScale * scaleMultiplier).toFixed(2));

  const squircleSize = Math.round((isTabletLandscape ? 104 : isTablet ? 88 : 52) * scaleMultiplier);
  const squircleIconSize = Math.round((isTabletLandscape ? 50 : isTablet ? 42 : 25) * scaleMultiplier);
  const titleFontSize = Math.round((isTabletLandscape ? 20 : isTablet ? 17.5 : 12) * scaleMultiplier);
  const cardPadding = Math.round((isTabletLandscape ? 24 : isTablet ? 18 : 12) * scaleMultiplier);

  const horizontalPadding = Math.round((isTabletLandscape ? 32 : isTablet ? 24 : 16) * scaleMultiplier);
  const buttonHeight = Math.round((isTabletLandscape ? 70 : isTablet ? 64 : 52) * scaleMultiplier);
  const buttonFontSize = Math.round((isTabletLandscape ? 21 : isTablet ? 19 : 16) * scaleMultiplier);
  const inputHeight = Math.round((isTabletLandscape ? 68 : isTablet ? 62 : 52) * scaleMultiplier);
  const headerButtonSize = Math.round(
    (isTabletLandscape ? (isLargeTablet ? 60 : 56) : isTablet ? (isLargeTablet ? 54 : 50) : 38) * scaleMultiplier
  );
  const headerIconSize = Math.round(
    (isTabletLandscape ? (isLargeTablet ? 34 : 32) : isTablet ? (isLargeTablet ? 30 : 28) : 20) * scaleMultiplier
  );
  const moduleCardHeight = Math.round(
    (isTabletLandscape ? 185 : isLargeTablet ? 168 : isTablet ? 152 : 102) * scaleMultiplier
  );

  return {
    width,
    height,
    isTablet,
    isLargeTablet,
    isLandscape,
    isTabletLandscape,
    contentMaxWidth,
    contentContainerStyle: isTablet
      ? {
          width: '100%',
          maxWidth: contentMaxWidth,
          alignSelf: 'center',
          paddingHorizontal: isTabletLandscape ? 24 : isTablet ? 18 : 8,
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
    moduleColumns: isTabletLandscape ? 4 : isTablet ? 3 : 2,
    cardColumns: isTabletLandscape ? 3 : isTablet ? 2 : 1,
    sheetMaxWidth: isTabletLandscape ? 740 : isTablet ? 600 : 440,
    horizontalPadding,
    buttonHeight,
    buttonFontSize,
    inputHeight,
    headerButtonSize,
    headerIconSize,
    moduleCardHeight,

    fontScale,
    iconScale,
    squircleSize,
    squircleIconSize,
    titleFontSize,
    cardPadding,
    isDualPane: isTabletLandscape && width >= 900,

    uiScaleFactor: scaleMultiplier,
    uiScaleLevel: appScaleLevel,
    uiScalePercent: scaleInfo.percent,
    uiScaleLabelKu: scaleInfo.labelKu,
    uiScaleLabelEn: scaleInfo.labelEn,
  };
}

/**
 * Returns tablet-optimized container style for screens.
 */
export function getResponsiveContainerStyle(width: number): ViewStyle {
  if (width >= JUMBO_TABLET_BREAKPOINT) {
    return { width: '100%', maxWidth: 1340, alignSelf: 'center' };
  }
  if (width >= LARGE_TABLET_BREAKPOINT) {
    return { width: '100%', maxWidth: 1160, alignSelf: 'center' };
  }
  if (width >= TABLET_BREAKPOINT) {
    return { width: '100%', maxWidth: 980, alignSelf: 'center' };
  }
  return { width: '100%' };
}
