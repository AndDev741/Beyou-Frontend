import { View, Text, Pressable } from 'react-native';
import { dayFromOverview, weekDaysOf } from '@beyou/state';
import type { CalendarOverview } from '@beyou/types/calendar/calendar';
import DayMarkers from './DayMarkers';
import { useDayLabel, useWeekdayHeads } from './calendarLabels';

interface CalendarWeekStripProps {
  /** Any day of the week to show; the strip runs Sunday to Saturday around it. */
  selected: string;
  overview: CalendarOverview | null;
  today: string;
  onSelect: (day: string) => void;
}

/** The week view's seven days, each with its markers. The day list below follows the selection. */
export default function CalendarWeekStrip({ selected, overview, today, onSelect }: CalendarWeekStripProps) {
  const heads = useWeekdayHeads();
  const labelOf = useDayLabel();
  const days = weekDaysOf(selected);

  return (
    <View className="flex-row" testID="calendar-week">
      {days.map((date, index) => {
        const day = dayFromOverview(overview, date);
        const isSelected = date === selected;
        const isToday = date === today;
        return (
          <Pressable
            key={date}
            onPress={() => onSelect(date)}
            accessibilityRole="button"
            accessibilityLabel={labelOf(day)}
            accessibilityState={{ selected: isSelected }}
            testID={`calendar-week-day-${date}`}
            className="min-h-[72px] flex-1 p-0.5"
          >
            <View
              className={`flex-1 items-center justify-center gap-1 rounded-control border py-1.5 ${
                isSelected ? 'border-accent bg-accent-soft' : 'border-transparent'
              }`}
            >
              <Text className="text-[10.5px] text-text-3">{heads[index]}</Text>
              <View
                className={`h-7 min-w-7 items-center justify-center rounded-full px-1 ${
                  isToday ? 'bg-accent' : ''
                }`}
              >
                <Text
                  className={`text-[14px] ${
                    isToday ? 'font-semibold text-on-accent' : isSelected ? 'font-semibold text-accent' : 'text-text'
                  }`}
                >
                  {Number(date.slice(8))}
                </Text>
              </View>
              <DayMarkers day={day} testIDPrefix={`calendar-week-day-${date}`} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
