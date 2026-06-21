import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { getSnapshot, getSnapshotDatesForMonth } from '@beyou/api/routine/snapshot';
import { enterSnapshot, enterSnapshotDates, setSelectedDate } from '@beyou/state';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { notify } from '../../notify';
import SnapshotCard from './SnapshotCard';
import { useSnapshotCheckin } from './useSnapshotCheckin';
import type { RootState, AppDispatch } from '../../store';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const monthOf = (d: Date) => d.toISOString().slice(0, 7);
const daysBack = (n: number): Date => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

export default function SnapshotHistory({ routineId }: { routineId: string }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { check, skip } = useSnapshotCheckin(routineId);
  const selectedDate = useSelector((s: RootState) => s.snapshot.selectedDate);
  const snapshots = useSelector((s: RootState) => s.snapshot.snapshots);
  const dates = useSelector((s: RootState) => s.snapshot.snapshotDates ?? []);
  const [showPicker, setShowPicker] = useState(false);

  const chips = useMemo(() => Array.from({ length: 7 }, (_, i) => iso(daysBack(i))), []);

  useEffect(() => {
    (async () => {
      const currentMonth = monthOf(new Date());
      const oldestChipMonth = monthOf(daysBack(6));

      const [currentRes, prevRes] = await Promise.all([
        getSnapshotDatesForMonth(routineId, currentMonth, t),
        oldestChipMonth !== currentMonth
          ? getSnapshotDatesForMonth(routineId, oldestChipMonth, t)
          : Promise.resolve(null),
      ]);

      const currentDates = currentRes.success?.dates ?? [];
      const prevDates = prevRes?.success?.dates ?? [];
      const merged = Array.from(new Set([...currentDates, ...prevDates]));
      dispatch(enterSnapshotDates(merged));
    })();
  }, [routineId, t, dispatch]);

  const load = async (date: string) => {
    dispatch(setSelectedDate(date));
    const res = await getSnapshot(routineId, date, t);
    if (res.success) {
      dispatch(enterSnapshot(res.success));
    } else {
      notify.error(res.error ?? t('UnexpectedError'));
    }
  };

  const onPick = (e: DateTimePickerEvent, d?: Date) => {
    setShowPicker(false);
    if (e.type === 'set' && d) load(iso(d));
  };

  const current = Object.values(snapshots).find((s) => s.snapshotDate === selectedDate);

  return (
    <View className="mt-4 gap-3">
      <Text className="text-secondary text-base font-semibold">{t('History')}</Text>
      <View className="flex-row flex-wrap gap-2">
        {chips.map((date, i) => {
          const sel = date === selectedDate;
          const has = dates.includes(date);
          return (
            <Pressable key={date} onPress={() => load(date)} accessibilityRole="button" testID={`day-chip-${i}`}
              className={`items-center rounded-lg border px-3 py-2 ${sel ? 'border-primary bg-primary/10' : 'border-primary/30'}`}>
              <Text className={`text-xs ${sel ? 'text-primary font-semibold' : 'text-secondary'}`}>{date.slice(5)}</Text>
              {has ? <View className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" /> : null}
            </Pressable>
          );
        })}
        <Pressable onPress={() => setShowPicker(true)} accessibilityRole="button" testID="snapshot-date-more"
          className="items-center justify-center rounded-lg border border-primary/30 px-3 py-2">
          <Ionicons name="calendar-outline" size={18} color={theme.primary} />
        </Pressable>
      </View>

      {showPicker ? (
        <DateTimePicker value={selectedDate ? new Date(selectedDate) : new Date()} mode="date" maximumDate={new Date()} onChange={onPick} testID="snapshot-date-picker" />
      ) : null}

      {selectedDate ? (
        current ? (
          <SnapshotCard snapshot={current} onCheck={(id) => check(current, id)} onSkip={(id) => skip(current, id)} />
        ) : (
          <Text className="text-description text-sm">{t('NoSnapshotForDay')}</Text>
        )
      ) : null}
    </View>
  );
}
