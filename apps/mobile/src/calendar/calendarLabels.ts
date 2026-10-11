import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { moodLabelKey } from '@beyou/state';
import type { CalendarDay } from '@beyou/types/calendar/calendar';
import { moodLevelOf, noonOf } from './calendarDay';

/** The accessible name of a day: its date, then what it holds. */
export function useDayLabel() {
  const { t, i18n } = useTranslation();
  const format = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' }),
    [i18n.language],
  );
  return (day: CalendarDay) => {
    const parts: string[] = [];
    if (day.tasks.length > 0) parts.push(t('CalendarDayTasksCount', { count: day.tasks.length }));
    day.routines.forEach((routine) => parts.push(routine.name));
    if (day.goals.length > 0) parts.push(t('CalendarGoalEnds'));
    const mood = moodLevelOf(day);
    if (mood) parts.push(`${t('CalendarMood')}: ${t(moodLabelKey(mood))}`);
    const date = format.format(noonOf(day.date));
    return parts.length > 0 ? `${date}: ${parts.join(', ')}` : date;
  };
}

/** Sunday-first narrow weekday names ("S M T W T F S"), from a known Sunday. */
export function useWeekdayHeads() {
  const { i18n } = useTranslation();
  return useMemo(() => {
    const narrow = new Intl.DateTimeFormat(i18n.language, { weekday: 'narrow' });
    // 2026-02-01 is a Sunday; local noon keeps every device timezone on that same day.
    return Array.from({ length: 7 }, (_, index) => narrow.format(noonOf(`2026-02-0${index + 1}`)));
  }, [i18n.language]);
}
