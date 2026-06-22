import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { getSnapshot, getSnapshotDatesForMonth } from '@beyou/api/routine/snapshot';
import { getRoutineStats, enterSnapshots, enterSnapshotDates, setSelectedDate } from '@beyou/state';
import type { Routine } from '@beyou/types/routine/routine';
import type { Snapshot } from '@beyou/types/routine/snapshot';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import type { RootState, AppDispatch } from '../../store';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const monthOf = (d: Date) => d.toISOString().slice(0, 7);
const daysBack = (n: number): Date => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

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

  const today = iso(new Date());
  const chips = useMemo(() => Array.from({ length: 7 }, (_, i) => iso(daysBack(i))), []);
  const day = selectedDate || today;
  const isPast = day < today;

  useEffect(() => {
    (async () => {
      const results = await Promise.all(routines.map((r) => getSnapshotDatesForMonth(r.id as string, monthOf(new Date()), t)));
      const all = new Set<string>();
      results.forEach((res) => { if (res.success?.dates) res.success.dates.forEach((d) => all.add(d)); });
      dispatch(enterSnapshotDates([...all]));
    })();
  }, [routines, t, dispatch]);

  const load = async (date: string) => {
    dispatch(setSelectedDate(date === today ? '' : date));
    if (date >= today) return; // today → live mode, no snapshot fetch
    const results = await Promise.all(routines.map((r) => getSnapshot(r.id as string, date, t)));
    const valid = results.map((r) => r.success).filter(Boolean) as Snapshot[];
    dispatch(enterSnapshots(valid));
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
            <Pressable key={date} onPress={() => load(date)} accessibilityRole="button" testID={`rov-day-${i}`}
              className={`items-center rounded-lg border px-3 py-2 ${sel ? 'border-primary bg-primary/10' : 'border-primary/30'}`}>
              <Text className={`text-xs ${sel ? 'text-primary font-semibold' : 'text-secondary'}`}>{i === 0 ? t('History') : date.slice(5)}</Text>
              {has ? <View className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" /> : null}
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
    </View>
  );
}
