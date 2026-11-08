import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronDown, ChevronUp } from 'lucide-react-native';
import type { WeekDay } from '@beyou/types/schedule/weekDay';
import { formatItemDays, itemDaysMissSchedule, toggleItemDay } from '@beyou/state';
import Chip from '../Chip';
import WeekdayPicker from './WeekdayPicker';
import { useBeyouTheme } from '../../theme/ThemeProvider';

interface ItemDaysFieldProps {
  /** The item's name, for the toggle's accessible name ("Days for Clean the tank"). */
  name: string;
  days: readonly string[] | undefined;
  onChange: (days: WeekDay[]) => void;
  /** The routine's schedule, to warn when the item's days never meet it. None while creating. */
  scheduleDays?: readonly string[];
  /** Prefix for `${testID}-toggle` and the squares' `${testID}-day-Monday`. */
  testID: string;
}

/**
 * The days a routine item runs on, inside the days the routine runs.
 *
 * Closed it is one line, "Days · Every day of the routine" or "Days · Sat · Sun", so a tray of
 * several items does not grow seven squares per row. Open, the squares sit under it. Used by
 * the section picker's tray and by the list routine's rows; the web has the same field.
 */
export default function ItemDaysField({ name, days, onChange, scheduleDays, testID }: ItemDaysFieldProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [open, setOpen] = useState(false);
  const label = formatItemDays(days, t);
  const misses = itemDaysMissSchedule(days, scheduleDays);

  return (
    <View>
      <Pressable
        onPress={() => setOpen((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel={t('ItemDaysFor', { name })}
        accessibilityState={{ expanded: open }}
        testID={`${testID}-toggle`}
        className="flex-row items-center gap-1.5 py-1"
      >
        <CalendarDays size={13} color={theme.text3} />
        <Text className="text-[11.5px] font-semibold text-text-2">{t('Days')}</Text>
        <Text
          className={`min-w-0 flex-1 text-[11.5px] ${label ? 'font-mono-semibold text-accent' : 'text-text-3'}`}
          numberOfLines={1}
        >
          {label || t('ItemDaysFollowRoutine')}
        </Text>
        {open ? <ChevronUp size={14} color={theme.text3} /> : <ChevronDown size={14} color={theme.text3} />}
      </Pressable>
      {open ? (
        <View className="mt-1">
          <WeekdayPicker
            size="sm"
            value={days ?? []}
            onToggle={(day) => onChange(toggleItemDay(days, day))}
            testIDPrefix={`${testID}-day`}
          />
        </View>
      ) : null}
      {misses ? (
        <Text className="mt-1 text-[11px] text-danger" testID={`${testID}-miss`}>
          {t('ItemDaysMissSchedule')}
        </Text>
      ) : null}
    </View>
  );
}

/** The item's days in short form ("Sat · Sun"), drawn only when it has some. */
export function ItemDaysChip({ days, testID }: { days: readonly string[] | undefined; testID?: string }) {
  const { t } = useTranslation();
  const label = formatItemDays(days, t);
  if (!label) return null;
  return (
    <Chip size="sm" variant="accent" testID={testID}>
      {label}
    </Chip>
  );
}
