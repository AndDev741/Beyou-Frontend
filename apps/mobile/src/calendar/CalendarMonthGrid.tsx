import { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { dayFromOverview, isInMonth, monthGridDays, type MonthCursor } from '@beyou/state';
import type { CalendarOverview } from '@beyou/types/calendar/calendar';
import { clamp, useMeasuredWidth } from '../ui/useMeasuredWidth';
import DayMarkers from './DayMarkers';
import { useDayLabel, useWeekdayHeads } from './calendarLabels';

/**
 * What sits around the grid on the calendar screen: the scroll view's 16px a side, the card's
 * 6px a side and its 1px border. Only for the first frame; `onLayout` gives the real width.
 */
const SURROUNDINGS = 16 * 2 + 6 * 2 + 2;

/**
 * Kept free at the end of every week. `onLayout` reports a pixel-rounded width, at times a hair
 * wider than the float Yoga lays out with, so seven cells sized to it exactly could overflow.
 */
const ROUNDING_SLACK = 1;

interface CalendarMonthGridProps {
  cursor: MonthCursor;
  overview: CalendarOverview | null;
  selected: string;
  today: string;
  onSelect: (day: string) => void;
}

/**
 * The month as whole weeks, padding days from the neighbouring months included and dimmed, so
 * every cell is a real day with its own markers (R14). Tapping a padding day selects it, and
 * the grid follows to that month.
 *
 * Seven columns from the measured width, never percentages, so the grid fills the card at any
 * phone width; at 360dp a cell is still about 44px wide. Each week is its own row rather than
 * one wrapping row for the month: with wrapping, a width that rounded the wrong way pushed the
 * 7th day onto the next line and slid the whole month a column.
 */
export default function CalendarMonthGrid({ cursor, overview, selected, today, onSelect }: CalendarMonthGridProps) {
  const heads = useWeekdayHeads();
  const labelOf = useDayLabel();
  const { width, onLayout } = useMeasuredWidth((windowWidth) => windowWidth - SURROUNDINGS);

  const days = useMemo(() => monthGridDays(cursor), [cursor]);
  const cellWidth = Math.max(0, Math.floor((width - ROUNDING_SLACK) / 7));
  const weeks = useMemo(
    () => Array.from({ length: Math.ceil(days.length / 7) }, (_, week) => days.slice(week * 7, week * 7 + 7)),
    [days],
  );
  const cellHeight = Math.max(52, Math.round(cellWidth * 1.15));
  const numberSize = clamp(Math.round(cellWidth * 0.3), 12, 17);
  const numberBox = numberSize + 12;

  return (
    <View onLayout={onLayout} testID="calendar-month">
      <View className="flex-row justify-center">
        {heads.map((head, index) => (
          <Text
            key={`head-${index}`}
            style={{ width: cellWidth }}
            className="pb-1 text-center text-[10.5px] text-text-3"
            importantForAccessibility="no"
            accessibilityElementsHidden
          >
            {head}
          </Text>
        ))}
      </View>
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} className="flex-row justify-center" testID={`calendar-month-week-${weekIndex}`}>
          {week.map((date) => {
            const day = dayFromOverview(overview, date);
            const inMonth = isInMonth(date, cursor);
            const isSelected = date === selected;
            const isToday = date === today;
            return (
              <Pressable
                key={date}
                onPress={() => onSelect(date)}
                accessibilityRole="button"
                accessibilityLabel={labelOf(day)}
                accessibilityState={{ selected: isSelected }}
                testID={`calendar-day-${date}`}
                style={{ width: cellWidth, height: cellHeight, opacity: inMonth ? 1 : 0.4 }}
                className="p-0.5"
              >
                <View
                  className={`flex-1 items-center justify-center gap-1 rounded-control border ${
                    isSelected ? 'border-accent bg-accent-soft' : 'border-transparent'
                  }`}
                >
                  <View
                    style={{ minWidth: numberBox, height: numberBox, borderRadius: numberBox / 2 }}
                    className={`items-center justify-center px-1 ${isToday ? 'bg-accent' : ''}`}
                    testID={isToday ? `calendar-day-${date}-today` : undefined}
                  >
                    <Text
                      style={{ fontSize: numberSize }}
                      className={
                        isToday
                          ? 'font-semibold text-on-accent'
                          : isSelected
                            ? 'font-semibold text-accent'
                            : 'text-text'
                      }
                    >
                      {Number(date.slice(8))}
                    </Text>
                  </View>
                  <DayMarkers day={day} testIDPrefix={`calendar-day-${date}`} />
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
