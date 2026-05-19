import { useWindowDimensions } from 'react-native';

/**
 * Responsive metadata for the current viewport.
 *
 * `isTablet`     — iPad portrait and wider (≥768).
 * `isSmallPhone` — iPhone SE 1st gen and similar (<360 wide).
 * `isLandscape`  — width > height.
 * `contentMaxWidth` — recommended cap for narrative / detail content
 *                     so iPad does not stretch single-column layouts
 *                     edge-to-edge.
 */
export interface Responsive {
  width: number;
  height: number;
  isTablet: boolean;
  isSmallPhone: boolean;
  isLandscape: boolean;
  contentMaxWidth: number;
}

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isSmallPhone = width < 360;
  const isLandscape = width > height;
  return {
    width,
    height,
    isTablet,
    isSmallPhone,
    isLandscape,
    contentMaxWidth: isTablet ? 720 : width,
  };
}
