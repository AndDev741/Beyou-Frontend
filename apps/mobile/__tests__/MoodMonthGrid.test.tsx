/**
 * R22: the diary's month fills the width it is given. The cells used to be percentage-wide with
 * a fixed 11px number and 16px face, which read as a small grid inside a big card. They are now
 * sized from the measured width, square, seven to a row, and what is inside grows with them.
 */
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { monthGrid } from '@beyou/state';
import type { MoodEntry } from '@beyou/types/mood/mood';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import MoodMonthGrid, { MOOD_GRID_GAP } from '../src/ui/mood/MoodMonthGrid';

const cells = monthGrid(2026, 9);
const byDate: Record<string, MoodEntry> = {
  '2026-10-05': { id: 'e1', date: '2026-10-05', mood: 4, note: null, updatedAt: '2026-10-05T12:00:00Z' },
};

const styleOf = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);

async function renderAt(width: number) {
  await act(async () => {
    render(
      <BeyouThemeProvider>
        <MoodMonthGrid
          cells={cells}
          byDate={byDate}
          today="2026-10-31"
          selected="2026-10-05"
          onSelect={() => {}}
          formatDay={(day) => day}
        />
      </BeyouThemeProvider>,
    );
  });
  await act(async () => {
    fireEvent(screen.getByTestId('mood-month'), 'layout', { nativeEvent: { layout: { width, height: 300 } } });
  });
}

describe('MoodMonthGrid', () => {
  /**
   * One flex-wrap row used to hold the whole month, with gaps stretched so seven cells met the
   * measured width exactly. `onLayout` reports a pixel-rounded width while Yoga breaks lines on
   * the unrounded one, so on a 384dp phone at density 2.8125 (314.31 reported, 314.0 real) the
   * 7th day wrapped and the month slid a column. Each week is its own row now: nothing to wrap.
   */
  it('lays the month out in week rows of exactly seven cells', async () => {
    await renderAt(314.31);

    const weeks = cells.length / 7;
    for (let week = 0; week < weeks; week += 1) {
      const row = within(screen.getByTestId(`mood-month-week-${week}`));
      expect(row.getAllByTestId(/^mood-(day-\d{4}-\d{2}-\d{2}|pad-\d+)$/)).toHaveLength(7);
    }
    expect(screen.queryByTestId(`mood-month-week-${weeks}`)).toBeNull();
    // The 1st of October 2026 is a Thursday: fifth cell of the first week, whatever the width.
    expect(within(screen.getByTestId('mood-month-week-0')).getByTestId('mood-day-2026-10-01')).toBeTruthy();
  });

  it('sizes square cells from the measured width and leaves room for rounding', async () => {
    // 318.5 is a width where a cell with no slack (42) would leave the row only half a dp short.
    await renderAt(318.5);

    const { width: cell, height } = styleOf('mood-day-2026-10-01') as { width: number; height: number };
    expect(height).toBe(cell);
    expect(cell).toBe(41);
    // A row of seven cells and six gaps stays at least 1dp inside what was measured.
    expect(cell * 7 + MOOD_GRID_GAP * 6).toBeLessThanOrEqual(318.5 - 1);
  });

  it('grows the day number and the face with the cell', async () => {
    await renderAt(322);
    const smallNumber = styleOf('mood-day-2026-10-01-number').fontSize as number;
    const smallFace = styleOf('mood-day-2026-10-01-blank').width as number;
    // Bigger than the fixed 11px number and 16px face the grid used to draw.
    expect(smallNumber).toBeGreaterThan(11);
    expect(smallFace).toBeGreaterThan(16);

    await act(async () => {
      fireEvent(screen.getByTestId('mood-month'), 'layout', { nativeEvent: { layout: { width: 692, height: 600 } } });
    });

    expect(styleOf('mood-day-2026-10-01')).toEqual(expect.objectContaining({ width: 95, height: 95 }));
    expect(styleOf('mood-day-2026-10-01-number').fontSize).toBeGreaterThan(smallNumber);
    expect(styleOf('mood-day-2026-10-01-blank').width).toBeGreaterThan(smallFace);
  });
});
