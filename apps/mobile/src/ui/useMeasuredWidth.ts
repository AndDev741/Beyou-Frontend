import { useCallback, useState } from 'react';
import { useWindowDimensions, type LayoutChangeEvent } from 'react-native';

/**
 * The width a block was actually given, read from `onLayout`.
 *
 * Until the first layout lands it answers `estimate(windowWidth)`, the caller's guess from the
 * paddings around it, so the first frame is already close to right and nothing pops in once the
 * real number arrives. The month grids (mood and calendar) size their cells from this rather
 * than from percentages: a percentage width plus `aspectRatio` left the mood month as a small
 * grid inside a big card, with fixed 11px numbers and 16px faces whatever room it had.
 */
export function useMeasuredWidth(estimate: (windowWidth: number) => number) {
  const { width: windowWidth } = useWindowDimensions();
  const [measured, setMeasured] = useState<number | null>(null);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next > 0) setMeasured((previous) => (previous === next ? previous : next));
  }, []);

  return { width: measured ?? Math.max(0, estimate(windowWidth)), onLayout };
}

/** The side of one square cell when `columns` of them and their gaps share `width`. */
export function gridCellSize(width: number, columns: number, gap: number): number {
  return Math.max(0, Math.floor((width - gap * (columns - 1)) / columns));
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
