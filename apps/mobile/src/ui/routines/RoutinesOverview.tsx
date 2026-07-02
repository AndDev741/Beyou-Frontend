import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { getSnapshotsForDay, getSnapshotDatesForMonth } from '@beyou/api/routine/snapshot';
import { getRoutineStats, enterSnapshots, enterSnapshotDates, setSelectedDate } from '@beyou/state';
import type { Routine } from '@beyou/types/routine/routine';
import type { Snapshot } from '@beyou/types/routine/snapshot';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import type { RootState, AppDispatch } from '../../store';
import SnapshotCard from './SnapshotCard';
import { useSnapshotCheckin } from './useSnapshotCheckin';

interface SnapshotPair {
  snapshot: Snapshot;
  routineId: string;
}

function SnapshotWithCheckin({ snapshot, routineId }: { snapshot: Snapshot; routineId: string }) {
  const { check, skip } = useSnapshotCheckin(routineId);
  return <SnapshotCard snapshot={snapshot} onCheck={(id) => check(snapshot, id)} onSkip={(id) => skip(snapshot, id)} />;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const monthOf = (d: Date) => d.toISOString().slice(0, 7);
const daysBack = (n: number): Date => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
// getDay() 0=Sun..6=Sat → existing Mon..Sun i18n keys (en/pt); reused for the chip weekday label.
const WEEKDAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
// Parse at noon so the local weekday + day-number match the ISO date (no tz day-shift).
const dateAtNoon = (dateStr: string) => new Date(`${dateStr}T12:00:00`);

function Insight({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="flex-1 items-center rounded-xl bg-primary/10 py-3">
      <Text className="text-primary text-lg font-bold">{value}</Text>
      <Text className="text-description text-xs">{label}</Text>
    </View>
  );
}

export default function RoutinesOverview({ routines }: { routines: Routine[] }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const dispatch = useDispatch<AppDispatch>();
  const selectedDate = useSelector((s: RootState) => s.snapshot.selectedDate);
  const snapshots = useSelector((s: RootState) => s.snapshot.snapshots);
  const dates = useSelector((s: RootState) => s.snapshot.snapshotDates ?? []);
  const [showPicker, setShowPicker] = useState(false);
  const [snapshotPairs, setSnapshotPairs] = useState<SnapshotPair[]>([]);

  const today = iso(new Date());
  const chips = useMemo(() => Array.from({ length: 5 }, (_, i) => iso(daysBack(i))), []);
  const day = selectedDate || today;
  const isPast = day < today;

  useEffect(() => {
    (async () => {
      const curMonth = monthOf(new Date());
      const oldestChip = chips[chips.length - 1]; // 4 days back
      const oldestMonth = oldestChip.slice(0, 7);
      const months = oldestMonth !== curMonth ? [curMonth, oldestMonth] : [curMonth];
      const calls = routines.flatMap((r) => months.map((m) => getSnapshotDatesForMonth(r.id as string, m, t)));
      const results = await Promise.all(calls);
      const all = new Set<string>();
      results.forEach((res) => { if (res.success?.dates) res.success.dates.forEach((d) => all.add(d)); });
      dispatch(enterSnapshotDates([...all]));
    })();
  }, [routines, t, dispatch, chips]);

  const load = async (date: string) => {
    dispatch(setSelectedDate(date === today ? '' : date));
    if (date >= today) { setSnapshotPairs([]); return; } // today → live mode, no snapshot fetch
    const result = await getSnapshotsForDay(date, t);
    const valid = result.success ?? [];
    dispatch(enterSnapshots(valid));
    setSnapshotPairs(valid.map((s) => ({ snapshot: s, routineId: s.routineId })));
  };

  const onPick = (e: DateTimePickerEvent, d?: Date) => { setShowPicker(false); if (e.type === 'set' && d) load(iso(d)); };

  // Insights for the selected day.
  const daySnapshots = useMemo(() => Object.values(snapshots).filter((s) => s.snapshotDate === day), [snapshots, day]);
  const insights = useMemo(() => {
    if (isPast) {
      const allChecks = daySnapshots.flatMap((s) => s.checks);
      const sections = daySnapshots.reduce((n, s) => n + s.structure.sections.length, 0);
      return { count: daySnapshots.length, sections, done: `${allChecks.filter((c) => c.checked).length}/${allChecks.length}`, xp: allChecks.reduce((n, c) => n + (c.checked ? c.xpGenerated : 0), 0) };
    }
    const agg = routines.reduce((acc, r) => { const st = getRoutineStats(r, today); return { sections: acc.sections + (r.routineSections?.length ?? 0), completed: acc.completed + st.completedItems, total: acc.total + st.totalItems, xp: acc.xp + st.xpEarned }; }, { sections: 0, completed: 0, total: 0, xp: 0 });
    return { count: routines.length, sections: agg.sections, done: `${agg.completed}/${agg.total}`, xp: agg.xp };
  }, [isPast, daySnapshots, routines, today]);

  return (
    <View className="gap-3 px-4 pb-2">
      <View className="flex-row flex-wrap gap-2">
        {chips.map((date, i) => {
          const sel = date === day;
          const has = dates.includes(date);
          return (
            <Pressable key={date} onPress={() => load(date)} accessibilityRole="button" accessibilityState={{ selected: sel }} testID={`rov-day-${i}`}
              className={`h-14 w-12 items-center justify-center rounded-2xl border-2 ${sel ? 'border-primary bg-primary' : 'border-primary/20'}`}>
              <Text className={`text-[10px] font-bold tracking-wide ${sel ? 'text-background' : 'text-description'}`}>
                {t(WEEKDAY_KEYS[dateAtNoon(date).getDay()]).toUpperCase()}
              </Text>
              <Text className={`text-sm font-bold ${sel ? 'text-background' : 'text-secondary'}`}>{dateAtNoon(date).getDate()}</Text>
              {has && !sel ? <View className="mt-0.5 h-1 w-1 rounded-full bg-primary" /> : null}
            </Pressable>
          );
        })}
        <Pressable onPress={() => setShowPicker(true)} accessibilityRole="button" testID="routines-date-more"
          className="items-center justify-center rounded-lg border border-primary/30 px-3 py-2">
          <Ionicons name="calendar-outline" size={18} color={theme.primary} />
        </Pressable>
      </View>
      {showPicker ? (
        <DateTimePicker value={day ? new Date(day) : new Date()} mode="date" maximumDate={new Date()} onChange={onPick} testID="routines-date-picker" />
      ) : null}

      <View className="flex-row gap-2">
        <Insight label={t('RoutinesCount')} value={insights.count} />
        <Insight label={t('Sections')} value={insights.sections} />
        <Insight label={t('ItemsDone')} value={insights.done} />
        <Insight label={t('XpEarned')} value={insights.xp} />
      </View>

      {isPast && snapshotPairs.length > 0 ? (
        <View className="gap-3">
          {snapshotPairs.map((pair) => {
            const live = snapshots[pair.snapshot.id] ?? pair.snapshot;
            return (
              <SnapshotWithCheckin key={pair.snapshot.id} snapshot={live} routineId={pair.routineId} />
            );
          })}
        </View>
      ) : null}
      {isPast && snapshotPairs.length === 0 ? (
        <Text className="text-description text-center text-sm">{t('NoSnapshotForDay')}</Text>
      ) : null}
    </View>
  );
}
