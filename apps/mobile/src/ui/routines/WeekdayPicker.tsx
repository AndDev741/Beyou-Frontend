import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { WeekDay } from '@beyou/types/schedule/weekDay';
import { WEEK_DAYS_SUNDAY_FIRST } from '@beyou/state';

interface WeekdayPickerProps {
  /** The selected days, as the backend writes them ("Monday"...). */
  value: readonly string[];
  onToggle: (day: WeekDay) => void;
  /** Days taken by something else: drawn in danger and announced disabled. What a press means stays with the caller. */
  isBlocked?: (day: WeekDay) => boolean;
  /** `${testIDPrefix}-${day}` on each square. The schedule sheet keeps its `day-Monday`. */
  testIDPrefix?: string;
  /** "md" is the schedule sheet's row; "sm" fits inside a routine item. */
  size?: 'sm' | 'md';
}

/**
 * The week in one row of seven squares, Sunday first like the routine card's.
 *
 * A square shows the day's initial and is NAMED by the whole translated day, with its pressed
 * state in `accessibilityState.selected`. Same component as the web's `WeekdayPicker`; it holds
 * no state.
 */
export default function WeekdayPicker({
  value,
  onToggle,
  isBlocked,
  testIDPrefix = 'day',
  size = 'md',
}: WeekdayPickerProps) {
  const { t } = useTranslation();
  const selected = new Set(value.map((day) => day.toLowerCase()));
  const box = size === 'sm' ? 'h-7 rounded-[8px]' : 'h-8 rounded-[10px]';
  const font = size === 'sm' ? 'text-[11px]' : 'text-[11.5px]';

  return (
    <View className="flex-row" style={{ gap: 6 }}>
      {WEEK_DAYS_SUNDAY_FIRST.map((day) => {
        const blocked = isBlocked?.(day) ?? false;
        const active = selected.has(day.toLowerCase());
        return (
          <Pressable
            key={day}
            onPress={() => onToggle(day)}
            accessibilityRole="button"
            accessibilityLabel={t(day)}
            accessibilityState={{ selected: active, disabled: blocked }}
            testID={`${testIDPrefix}-${day}`}
            className={`${box} flex-1 items-center justify-center ${
              active ? 'bg-accent' : blocked ? 'bg-danger/10' : 'bg-surface-2'
            }`}
          >
            <Text
              className={`font-mono-semibold ${font} ${
                active ? 'text-on-accent' : blocked ? 'text-danger' : 'text-text-3'
              }`}
            >
              {t(day).charAt(0).toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
