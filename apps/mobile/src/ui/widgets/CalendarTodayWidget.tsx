import { useCallback, useRef, type ReactNode } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useRouter } from 'expo-router';
import { CalendarCheck } from 'lucide-react-native';
import { addDaysIso, dayFromOverview } from '@beyou/state';
import type { CalendarTask } from '@beyou/types/calendar/calendar';
import WidgetCard from './WidgetCard';
import CalendarTaskRow from '../../calendar/CalendarTaskRow';
import useCalendarOverview from '../../calendar/useCalendarOverview';
import useCalendarTaskToggle from '../../calendar/useCalendarTaskToggle';
import useTodayInZone from '../useTodayInZone';
import { useBeyouTheme } from '../../theme/ThemeProvider';

/** Rows the card shows before it points at the calendar for the rest. */
const MAX_ROWS = 4;

/**
 * "Today in the calendar" (R18): today's calendar tasks, each one tap from done, and the way into
 * the calendar. Off until the person adds it in the widgets configuration; nothing here turns it
 * on.
 *
 * Self-fetching, like the heatmap, again whenever the dashboard comes back into view, since the
 * calendar screen may have changed the day meanwhile.
 *
 * It asks for a day either side of the phone's guess of today and shows the day the SERVER calls
 * today (`overview.today`), as the web card does. The guess comes from the profile's timezone,
 * which can be missing or stale, and near midnight it lands on the wrong day.
 */
export default function CalendarTodayWidget() {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const router = useRouter();
  const clientToday = useTodayInZone();
  const { overview, loading, error, reload, applyTask, removeTask } = useCalendarOverview(
    addDaysIso(clientToday, -1),
    addDaysIso(clientToday, 1),
  );
  const today = overview?.today ?? clientToday;
  // A task deleted on another device leaves the card when it is ticked.
  const { toggle, pendingId } = useCalendarTaskToggle({ onGone: removeTask });

  // The first focus is the mount, which the overview hook has just loaded.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void reload();
    }, [reload]),
  );

  const openCalendar = () => router.push({ pathname: '/calendar', params: { date: today } });

  const onToggle = async (task: CalendarTask) => {
    const updated = await toggle(task);
    if (updated) applyTask(updated);
  };

  const tasks = dayFromOverview(overview, today).tasks;
  const hidden = tasks.length - MAX_ROWS;

  let body: ReactNode;
  if (!overview && loading) {
    body = (
      <View className="items-center py-4">
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  } else if (!overview && error) {
    body = <Text className="mt-3 text-[12.5px] text-text-3">{t('CalendarLoadFailed')}</Text>;
  } else if (tasks.length === 0) {
    body = (
      <Text className="mt-3 text-[12.5px] text-text-3" testID="calendar-today-empty">
        {t('CalendarTodayWidgetEmpty')}
      </Text>
    );
  } else {
    body = (
      <View className="mt-2" testID="calendar-today-list">
        {tasks.slice(0, MAX_ROWS).map((task) => (
          <CalendarTaskRow
            key={task.id}
            task={task}
            past={false}
            pending={pendingId === task.id}
            onToggle={onToggle}
            onEdit={openCalendar}
            openLabel={t('CalendarOpen')}
          />
        ))}
        {hidden > 0 ? (
          <Pressable
            onPress={openCalendar}
            accessibilityRole="button"
            accessibilityLabel={t('CalendarOpen')}
            className="min-h-11 justify-center pl-11"
          >
            <Text className="font-mono text-[12px] text-text-3">{`+${hidden}`}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <WidgetCard
      title={t('CalendarTodayWidget')}
      icon={<CalendarCheck size={14.5} color={theme.text3} />}
      action={
        <Pressable
          onPress={openCalendar}
          accessibilityRole="button"
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          testID="calendar-today-open"
        >
          <Text className="text-[11.5px] font-medium text-text-3">{t('CalendarOpen')}</Text>
        </Pressable>
      }
      testID="calendar-today-widget"
    >
      {body}
    </WidgetCard>
  );
}
