import { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import createSchedule from '@beyou/api/schedule/createSchedule';
import editSchedule from '@beyou/api/schedule/editSchedule';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import type { Routine } from '@beyou/types/routine/routine';
import type { schedule } from '@beyou/types/schedule/schedule';
import Button from '../Button';
import { DAYS } from './ScheduleIndicator';
import { notify } from '../../notify';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const WEEKEND = ['Saturday', 'Sunday'];
const ALL = DAYS.map((d) => d.wire);

interface ScheduleSheetProps {
  visible: boolean;
  routine: Routine;
  otherSchedules: schedule[];
  onClose: () => void;
  onSaved: () => void;
}

export default function ScheduleSheet({ visible, routine, otherSchedules, onClose, onSaved }: ScheduleSheetProps) {
  const { t } = useTranslation();
  const [days, setDays] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDays(routine.schedule?.days ?? []);
  }, [visible, routine]);

  // day -> name of another routine already scheduled that day (conflict hint)
  const blockedBy = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of otherSchedules) {
      if (s.routine?.id === routine.id) continue;
      for (const d of s.days ?? []) if (!map[d]) map[d] = s.routine?.name ?? '';
    }
    return map;
  }, [otherSchedules, routine.id]);

  const toggle = (day: string) =>
    setDays((cur) => (cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day]));

  // Keep canonical Mon..Sun order on save regardless of tap order.
  const ordered = (list: string[]) => ALL.filter((d) => list.includes(d));

  const toggleGroup = (group: string[]) =>
    setDays((cur) => (group.every((d) => cur.includes(d)) ? cur.filter((d) => !group.includes(d)) : ordered([...new Set([...cur, ...group])])));

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

  if (!visible) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} accessibilityLabel={t('Cancel')} />
      <View className="absolute bottom-0 left-0 right-0 max-h-[85%] rounded-t-2xl bg-background p-4">
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
            return (
              <Pressable
                key={d.wire}
                onPress={() => toggle(d.wire)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                testID={`day-${d.wire}`}
                className={`flex-row items-center justify-between rounded-lg border p-3 ${selected ? 'border-primary bg-primary/10' : 'border-primary/30'}`}
              >
                <Text className={`text-base ${selected ? 'text-primary font-semibold' : 'text-secondary'}`}>{t(d.key)}</Text>
                {conflict ? <Text className="text-description text-xs">{t('ScheduledIn', { name: conflict })}</Text> : null}
              </Pressable>
            );
          })}
          <View className="mt-3 items-center">
            <Button text={t('Save schedule')} mode="create" submitting={submitting} onPress={save} testID="schedule-save" />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
