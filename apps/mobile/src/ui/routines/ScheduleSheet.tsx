import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import createSchedule from '@beyou/api/schedule/createSchedule';
import editSchedule from '@beyou/api/schedule/editSchedule';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import type { Routine } from '@beyou/types/routine/routine';
import Button from '../Button';
import BottomSheet from '../BottomSheet';
import { DAYS } from './ScheduleIndicator';
import { notify } from '../../notify';
import type { RootState } from '../../store';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const WEEKEND = ['Saturday', 'Sunday'];
const ALL = DAYS.map((d) => d.wire);

interface ScheduleSheetProps {
  visible: boolean;
  routine: Routine;
  onClose: () => void;
  onSaved: () => void;
}

export default function ScheduleSheet({ visible, routine, onClose, onSaved }: ScheduleSheetProps) {
  const { t } = useTranslation();
  // Read other routines' schedules straight from the routines slice (each routine
  // carries its `schedule.days`) — same source the web uses. A separate getSchedules
  // call was unreliable (shape mismatch → no conflicts detected).
  const allRoutines = useSelector((s: RootState) => s.routines.routines);
  const [days, setDays] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDays(routine.schedule?.days ?? []);
    setOverrides(new Set());
  }, [visible, routine]);

  // day -> name of ANOTHER routine already scheduled that day (conflict).
  const blockedBy = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of allRoutines) {
      if (r.id === routine.id) continue;
      for (const d of r.schedule?.days ?? []) if (!map[d]) map[d] = r.name;
    }
    return map;
  }, [allRoutines, routine.id]);

  // Keep canonical Mon..Sun order on save regardless of tap order.
  const ordered = (list: string[]) => ALL.filter((d) => list.includes(d));

  const select = (day: string) => setDays((cur) => (cur.includes(day) ? cur : ordered([...cur, day])));
  const toggle = (day: string) =>
    setDays((cur) => (cur.includes(day) ? cur.filter((d) => d !== day) : ordered([...cur, day])));

  const onDayPress = (day: string) => {
    // A day owned by another routine is blocked until the user confirms an override.
    if (blockedBy[day] && !overrides.has(day)) {
      Alert.alert(t('DayAlreadyScheduled'), t('ConfirmOverrideDay', { name: blockedBy[day] }), [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Override'),
          onPress: () => {
            setOverrides((prev) => new Set(prev).add(day));
            select(day);
          },
        },
      ]);
      return;
    }
    toggle(day);
  };

  // Quick-groups skip blocked (non-overridden) days — those need an explicit override.
  const toggleGroup = (group: string[]) =>
    setDays((cur) => {
      if (group.every((d) => cur.includes(d))) return cur.filter((d) => !group.includes(d));
      const allowed = group.filter((d) => !blockedBy[d] || overrides.has(d));
      return ordered([...new Set([...cur, ...allowed])]);
    });

  const save = async () => {
    setSubmitting(true);
    const payload = ordered(days);
    const res = routine.schedule?.id
      ? await editSchedule(routine.schedule.id, payload, routine.id as string, t)
      : await createSchedule(payload, routine.id as string, t);
    setSubmitting(false);
    if (res.error) { notify.error(getFriendlyErrorMessage(t, res.error)); return; }
    if (res.validation) { notify.error(res.validation); return; }
    notify.success(t(routine.schedule?.id ? 'edited successfully' : 'created successfully'));
    onSaved();
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
        <Text className="text-secondary mb-3 text-lg font-bold">{t('Schedule')}</Text>
        <View className="mb-3 flex-row flex-wrap gap-2">
          <Pressable onPress={() => toggleGroup(WEEKDAYS)} accessibilityRole="button" testID="group-weekdays" className="rounded-full border border-primary/40 px-3 py-1.5">
            <Text className="text-secondary text-xs">{t('Weekdays')}</Text>
          </Pressable>
          <Pressable onPress={() => toggleGroup(WEEKEND)} accessibilityRole="button" testID="group-weekend" className="rounded-full border border-primary/40 px-3 py-1.5">
            <Text className="text-secondary text-xs">{t('Weekend')}</Text>
          </Pressable>
          <Pressable onPress={() => toggleGroup(ALL)} accessibilityRole="button" testID="group-all" className="rounded-full border border-primary/40 px-3 py-1.5">
            <Text className="text-secondary text-xs">{t('AllDays')}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerClassName="gap-2" keyboardShouldPersistTaps="handled">
          {DAYS.map((d) => {
            const selected = days.includes(d.wire);
            const conflict = blockedBy[d.wire];
            const overridden = overrides.has(d.wire);
            const blocked = !!conflict && !overridden;
            return (
              <Pressable
                key={d.wire}
                onPress={() => onDayPress(d.wire)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                testID={`day-${d.wire}`}
                className={`flex-row items-center justify-between rounded-lg border-2 p-3 ${
                  blocked ? 'border-error' : selected ? 'border-primary bg-primary/10' : 'border-primary/30'
                }`}
              >
                <View className="flex-row items-center gap-2">
                  <Text className={`text-base ${selected ? 'text-primary font-semibold' : 'text-secondary'}`}>{t(d.key)}</Text>
                  {overridden ? <Text className="text-primary text-[10px] font-semibold uppercase">{t('Override')}</Text> : null}
                </View>
                {conflict ? <Text className={`text-xs ${blocked ? 'text-error' : 'text-description'}`}>{t('ScheduledIn', { name: conflict })}</Text> : null}
              </Pressable>
            );
          })}
          <View className="mt-3 items-center">
            <Button text={t('Save schedule')} mode="create" submitting={submitting} onPress={save} testID="schedule-save" />
          </View>
        </ScrollView>
    </BottomSheet>
  );
}
