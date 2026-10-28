import type { DimensionValue } from 'react-native';

/**
 * Calculates the exact responsive width percentage for cards in Modern, Luxe,
 * and Bento grids so that any remaining items in the final row stretch out
 * to fill the entire row width. Eliminates all empty gaps/holes on any screen
 * size (Mobile, Tablet Portrait, Tablet Landscape).
 *
 * Slots per row:
 * - Tablet Landscape: 4 columns
 * - Tablet Portrait: 3 columns
 * - Phone: 2 columns
 */
export function getResponsiveCardSpanWidth(
  index: number,
  totalItems: number,
  isTablet: boolean,
  isTabletLandscape: boolean
): `${number}%` {
  if (totalItems <= 0) return '100%';

  const cols = isTabletLandscape ? 4 : isTablet ? 3 : 2;
  const remainder = totalItems % cols;

  // If total divides evenly into columns, all items have standard width
  if (remainder === 0) {
    if (cols === 4) return '23.8%';
    if (cols === 3) return '31.8%';
    return '48.5%';
  }

  // Items before the final incomplete row have standard width
  const fullRowItemsCount = totalItems - remainder;
  if (index < fullRowItemsCount) {
    if (cols === 4) return '23.8%';
    if (cols === 3) return '31.8%';
    return '48.5%';
  }

  // Items in the final incomplete row stretch to fill the row:
  if (remainder === 1) {
    // 1 item alone in the last row -> stretches to 100%
    return '100%';
  }
  if (remainder === 2) {
    // 2 items in the last row -> both stretch to 48.5%
    return '48.5%';
  }
  if (remainder === 3) {
    // 3 items in the last row (possible on 4-col tablet landscape) -> all 3 stretch to 31.8%
    return '31.8%';
  }

  return '48.5%';
}

/**
 * Returns true if the item spans 100% of the row width.
 */
export function isItemFullWidth(
  index: number,
  totalItems: number,
  isTablet: boolean,
  isTabletLandscape: boolean
): boolean {
  return getResponsiveCardSpanWidth(index, totalItems, isTablet, isTabletLandscape) === '100%';
}

/**
 * Groups Compact modules into balanced, full-width rows with zero orphan gaps.
 *
 * On Phone (total = 5): Row 1 has 3 items (33.3%), Row 2 has 2 items (50%).
 * On Phone (total = 6): Row 1 has 3 items (33.3%), Row 2 has 3 items (33.3%).
 * On Tablet (total = 5): 1 row with 5 items (20%).
 * On Tablet Landscape (total = 6): 1 row with 6 items (16.6%).
 */
export function getCompactGridRows<T>(
  items: T[],
  isTablet: boolean,
  isTabletLandscape: boolean
): T[][] {
  const total = items.length;
  if (total === 0) return [];

  let rowCounts: number[] = [];

  if (isTabletLandscape) {
    if (total <= 6) rowCounts = [total];
    else if (total === 7) rowCounts = [4, 3];
    else if (total === 8) rowCounts = [4, 4];
    else rowCounts = [Math.ceil(total / 2), Math.floor(total / 2)];
  } else if (isTablet) {
    if (total <= 5) rowCounts = [total];
    else if (total === 6) rowCounts = [3, 3];
    else if (total === 7) rowCounts = [4, 3];
    else if (total === 8) rowCounts = [4, 4];
    else rowCounts = [Math.ceil(total / 2), Math.floor(total / 2)];
  } else {
    // Phone
    if (total <= 4) rowCounts = [total];
    else if (total === 5) rowCounts = [3, 2];
    else if (total === 6) rowCounts = [3, 3];
    else if (total === 7) rowCounts = [4, 3];
    else if (total === 8) rowCounts = [4, 4];
    else rowCounts = [4, total - 4];
  }

  const rows: T[][] = [];
  let currentIndex = 0;
  for (const count of rowCounts) {
    rows.push(items.slice(currentIndex, currentIndex + count));
    currentIndex += count;
  }
  if (currentIndex < items.length) {
    rows.push(items.slice(currentIndex));
  }
  return rows;
}

