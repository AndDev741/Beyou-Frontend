import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import {
  addDaysIso,
  dayFromOverview,
  firstOfMonth,
  isInMonth,
  monthOfIso,
  rangeForView,
  isIsoDay,
  shiftMonth,
  weekDaysOf,
  type CalendarView,
} from '@beyou/state';
import type { CalendarTask } from '@beyou/types/calendar/calendar';
import Button from '../../src/ui/Button';
import Card from '../../src/ui/Card';
import SegmentedControl from '../../src/ui/SegmentedControl';
import CelebrationOverlay from '../../src/ui/dashboard/CelebrationOverlay';
import useTodayInZone from '../../src/ui/useTodayInZone';
import { useAutoRefresh } from '../../src/hooks/useAutoRefresh';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import CalendarDayPanel from '../../src/calendar/CalendarDayPanel';
import CalendarMonthGrid from '../../src/calendar/CalendarMonthGrid';
import CalendarTaskSheet from '../../src/calendar/CalendarTaskSheet';
import CalendarWeekStrip from '../../src/calendar/CalendarWeekStrip';
import useCalendarOverview from '../../src/calendar/useCalendarOverview';
import useCalendarTaskToggle from '../../src/calendar/useCalendarTaskToggle';
import { loadCalendarView, saveCalendarView } from '../../src/calendar/calendarViewStore';
import { noonOf } from '../../src/calendar/calendarDay';

type SheetState = { visible: boolean; task: CalendarTask | null; date?: string };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * The calendar: dated tasks with the routine, goal deadlines and mood of each day, as a month
 * grid or a week strip, with the selected day listed below (R14–R18).
 *
 * `?date=yyyy-MM-dd` opens on that day (R17, the reminder email's link carries it); otherwise it
 * opens on today. The phone shows no notification of any kind in this delivery (R13).
 *
 * The selected day drives everything: the visible month or week is the one that contains it, so
 * moving the selection is how the page moves, and the overview request follows the range.
 */
export default function CalendarScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { theme } = useBeyouTheme();
  // The phone's guess of today, for the first frame. Once the overview is in, the server's
  // `today` (resolved in the profile's timezone) takes over below.
  const clientToday = useTodayInZone();
  const params = useLocalSearchParams<{ date?: string | string[] }>();
  const requestedDate = first(params.date);
  const linkedDay = isIsoDay(requestedDate) ? requestedDate : null;

  const [selected, setSelected] = useState(() => linkedDay ?? clientToday);
  // A new link while the screen is already open moves it to that day.
  useEffect(() => {
    if (linkedDay) setSelected(linkedDay);
  }, [linkedDay]);

  // The last view used on this device. Nothing is fetched until it is known, so a person who
  // left it on Week does not pay for a month they never see.
  const [view, setView] = useState<CalendarView>('month');
  const [viewReady, setViewReady] = useState(false);
  useEffect(() => {
    let active = true;
    void loadCalendarView().then((saved) => {
      if (!active) return;
      if (saved) setView(saved);
      setViewReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const changeView = (next: CalendarView) => {
    setView(next);
    void saveCalendarView(next);
  };

  const range = useMemo(() => rangeForView(view, selected), [view, selected]);
  const { overview, loading, error, reload, applyTask, removeTask } = useCalendarOverview(
    range.from,
    range.to,
    viewReady,
  );
  useAutoRefresh(reload, { enabled: viewReady });
  // Which day is today, and so which open tasks are missed, is the server's call: the profile's
  // timezone may be missing or differ from the phone's, and near midnight the two disagree.
  const today = overview?.today ?? clientToday;

  // A task deleted on another device leaves this one's day when it is ticked.
  const { toggle, pendingId } = useCalendarTaskToggle({ onGone: removeTask });
  const [sheet, setSheet] = useState<SheetState>({ visible: false, task: null });

  const cursor = useMemo(() => monthOfIso(selected), [selected]);
  const day = dayFromOverview(overview, selected);

  const step = (delta: 1 | -1) => {
    if (view === 'week') {
      setSelected((current) => addDaysIso(current, delta * 7));
      return;
    }
    const target = shiftMonth(cursor, delta);
    setSelected(isInMonth(today, target) ? today : firstOfMonth(target));
  };

  const onToggleTask = useCallback(
    async (task: CalendarTask) => {
      const updated = await toggle(task);
      if (updated) applyTask(updated);
    },
    [toggle, applyTask],
  );

  const onSaved = (task: CalendarTask) => {
    applyTask(task);
    // A task moved to another day is shown there, so the person sees where it went.
    setSelected(task.date);
  };

  const periodLabel = useMemo(() => {
    if (view === 'month') {
      return new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(
        noonOf(firstOfMonth(cursor)),
      );
    }
    const days = weekDaysOf(selected);
    const short = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' });
    return `${short.format(noonOf(days[0]))} – ${short.format(noonOf(days[6]))}`;
  }, [view, cursor, selected, i18n.language]);

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: 48 }} testID="calendar-screen">
      <View className="flex-row items-center justify-between px-4 pb-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityRole="button"
            accessibilityLabel={t('CalendarMobileBack')}
            testID="back-button"
            className="h-11 w-8 justify-center"
          >
            <ChevronLeft size={24} color={theme.text2} />
          </Pressable>
          <Text accessibilityRole="header" className="min-w-0 flex-1 text-[22px] font-semibold text-text">
            {t('Calendar')}
          </Text>
        </View>
        <Pressable
          onPress={() => setSheet({ visible: true, task: null, date: selected })}
          accessibilityRole="button"
          accessibilityLabel={t('CalendarNewTask')}
          testID="calendar-new-task"
          className="h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent active:opacity-80"
        >
          <Plus size={22} color={theme.onAccent} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        <SegmentedControl<CalendarView>
          label={t('Calendar')}
          value={view}
          onChange={changeView}
          size="sm"
          options={[
            { value: 'month', label: t('CalendarMonthView') },
            { value: 'week', label: t('CalendarWeekView') },
          ]}
          testID="calendar-view"
        />

        <Card padded={false} className="px-1.5 pb-2 pt-1">
          <View className="flex-row items-center">
            <Pressable
              onPress={() => step(-1)}
              accessibilityRole="button"
              accessibilityLabel={t('CalendarPrevious')}
              testID="calendar-previous"
              className="h-11 w-11 items-center justify-center rounded-control active:bg-surface-2"
            >
              <ChevronLeft size={18} color={theme.text2} />
            </Pressable>
            <Text
              className="min-w-0 flex-1 text-center text-sm font-semibold text-text"
              numberOfLines={1}
              testID="calendar-period"
            >
              {periodLabel}
            </Text>
            <Pressable
              onPress={() => setSelected(today)}
              accessibilityRole="button"
              accessibilityLabel={t('CalendarToday')}
              testID="calendar-today"
              className="h-11 justify-center px-1"
            >
              <View className="rounded-full border border-border px-3 py-1">
                <Text className="text-[12px] font-semibold text-text-2">{t('CalendarToday')}</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => step(1)}
              accessibilityRole="button"
              accessibilityLabel={t('CalendarNext')}
              testID="calendar-next"
              className="h-11 w-11 items-center justify-center rounded-control active:bg-surface-2"
            >
              <ChevronRight size={18} color={theme.text2} />
            </Pressable>
          </View>

          {view === 'month' ? (
            <CalendarMonthGrid
              cursor={cursor}
              overview={overview}
              selected={selected}
              today={today}
              onSelect={setSelected}
            />
          ) : (
            <CalendarWeekStrip selected={selected} overview={overview} today={today} onSelect={setSelected} />
          )}
        </Card>

        {error ? (
          <View className="flex-row items-center gap-3 rounded-card border border-border bg-surface px-4 py-3" testID="calendar-error">
            <Text className="min-w-0 flex-1 text-[12.5px] text-text-2">{t('CalendarLoadFailed')}</Text>
            <Button text={t('TryAgain')} mode="ghost" size="auto" onPress={() => void reload()} />
          </View>
        ) : null}

        {!overview && (loading || !viewReady) ? (
          <View className="items-center py-8" testID="calendar-loading">
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : (
          <CalendarDayPanel
            day={day}
            today={today}
            layout={view}
            pendingTaskId={pendingId}
            onToggleTask={onToggleTask}
            onEditTask={(task) => setSheet({ visible: true, task })}
            onAddTask={(date) => setSheet({ visible: true, task: null, date })}
          />
        )}
      </ScrollView>

      {/* Mounted only while open, so it always starts from the task (or day) it was opened
          for, never from the last one for a frame. */}
      {sheet.visible ? (
        <CalendarTaskSheet
          visible
          task={sheet.task}
          initialDate={sheet.date}
          onClose={() => setSheet({ visible: false, task: null })}
          onSaved={onSaved}
          onDeleted={removeTask}
        />
      ) : null}
      <CelebrationOverlay />
    </View>
  );
}
