import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { moodLabelKey } from '@beyou/state';
import type { MoodEntry } from '@beyou/types/mood/mood';
import { MOOD_FACES } from './moodScale';
import { clamp, gridCellSize, useMeasuredWidth } from '../useMeasuredWidth';
import { useBeyouTheme } from '../../theme/ThemeProvider';

/** Space between rows, and the least space between columns. */
export const MOOD_GRID_GAP = 4;

/**
 * Kept free at the end of every row. `onLayout` reports a pixel-rounded width, a hair wider at
 * times than the float Yoga lays out with; sizing to the exact reported width overflowed the row.
 */
const ROUNDING_SLACK = 1;

/**
 * What sits around the grid on the diary screen: the scroll view's 16px a side, the card's 18px
 * a side and its 1px border. Only used to guess the first frame; `onLayout` gives the real width.
 */
const SURROUNDINGS = 16 * 2 + 18 * 2 + 2;

interface MoodMonthGridProps {
  /** `monthGrid` output: whole weeks, `null` for the padding before the 1st and after the last. */
  cells: (string | null)[];
  byDate: Record<string, MoodEntry>;
  today: string;
  selected: string;
  onSelect: (day: string) => void;
  /** "14 Oct", for each cell's accessible name. */
  formatDay: (day: string) => string;
}

/**
 * The diary's month, seven square cells to a row that take the whole width of the card.
 *
 * Cells come from the measured width, and the day number and the face grow with them. They
 * used to be percentage cells with a fixed 11px number and a 16px face, which read as a small
 * grid floating in a big card.
 *
 * Each week is its own row, never one wrapping row for the month: with wrapping, a width that
 * rounded the wrong way sent the 7th day to the next line and the whole month slid a column.
 * A row that cannot wrap holds seven days whatever the rounding does.
 */
export default function MoodMonthGrid({ cells, byDate, today, selected, onSelect, formatDay }: MoodMonthGridProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const { width, onLayout } = useMeasuredWidth((windowWidth) => windowWidth - SURROUNDINGS);

  const cell = gridCellSize(width - ROUNDING_SLACK, 7, MOOD_GRID_GAP);
  const numberSize = clamp(Math.round(cell * 0.3), 11, 20);
  const faceSize = clamp(Math.round(cell * 0.48), 16, 36);
  const weeks = Array.from({ length: Math.ceil(cells.length / 7) }, (_, week) =>
    cells.slice(week * 7, week * 7 + 7),
  );

  const renderCell = (day: string | null, index: number) => {
    if (!day) {
      return <View key={`pad-${index}`} style={{ width: cell, height: cell }} testID={`mood-pad-${index}`} />;
    }
    const dayEntry = byDate[day];
    const face = dayEntry ? MOOD_FACES[dayEntry.mood] : null;
    const future = day > today;
    const label = `${formatDay(day)}: ${
      dayEntry ? t(moodLabelKey(dayEntry.mood)) : t('MoodNotRecorded')
    }`;
    return (
      <Pressable
        key={day}
        onPress={() => onSelect(day)}
        disabled={future}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: day === selected, disabled: future }}
        testID={`mood-day-${day}`}
        style={{ width: cell, height: cell }}
        className={`items-center justify-center gap-0.5 rounded-control border ${
          day === selected ? 'border-accent bg-surface-2' : 'border-transparent'
        }`}
      >
        <Text
          style={{ fontSize: numberSize }}
          className={future ? 'text-text-3' : 'text-text-2'}
          testID={`mood-day-${day}-number`}
        >
          {Number(day.slice(8))}
        </Text>
        {/* The day's own face rather than a coloured dot: the same five icons the scale
            uses, so a month reads in the language the rest of the screen already speaks.
            The empty view keeps every cell the same height. */}
        {face ? (
          <face.Icon size={faceSize} color={face.color(theme)} />
        ) : (
          <View style={{ width: faceSize, height: faceSize }} testID={`mood-day-${day}-blank`} />
        )}
      </Pressable>
    );
  };

  return (
    <View className="mt-3" style={{ gap: MOOD_GRID_GAP }} onLayout={onLayout} testID="mood-month">
      {weeks.map((week, weekIndex) => (
        // `space-between` spreads what the floor left over between the columns, so the week
        // still reaches both edges of the card.
        <View key={weekIndex} className="flex-row justify-between" testID={`mood-month-week-${weekIndex}`}>
          {week.map((day, dayIndex) => renderCell(day, weekIndex * 7 + dayIndex))}
        </View>
      ))}
    </View>
  );
}
