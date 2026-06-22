import { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import createSchedule from '@beyou/api/schedule/createSchedule';
import editSchedule from '@beyou/api/schedule/editSchedule';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import type { Routine } from '@beyou/types/routine/routine';
import type { schedule } from '@beyou/types/schedule/schedule';
import Button from '../Button';
import { DAYS } from './ScheduleIndicator';
import { useBeyouTheme } from '../../theme/ThemeProvider';
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
  const { theme } = useBeyouTheme();
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
    for (const s of otherSchedules) {
      if (s.routine?.id === routine.id) continue;
      for (const d of s.days ?? []) if (!map[d]) map[d] = s.routine?.name ?? '';
    }
    return map;
  }, [otherSchedules, routine.id]);

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
            const overridden = overrides.has(d.wire);
            const blocked = !!conflict && !overridden;
            return (
              <Pressable
                key={d.wire}
                onPress={() => onDayPress(d.wire)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                testID={`day-${d.wire}`}
                className={`flex-row items-center justify-between rounded-lg border p-3 ${
                  blocked ? 'border-description/30 bg-description/5' : selected ? 'border-primary bg-primary/10' : 'border-primary/30'
                }`}
              >
                <View className="flex-row items-center gap-2">
                  {blocked ? <Ionicons name="lock-closed" size={14} color={theme.description} /> : null}
                  <Text className={`text-base ${blocked ? 'text-description' : selected ? 'text-primary font-semibold' : 'text-secondary'}`}>{t(d.key)}</Text>
                  {overridden ? <Text className="text-primary text-[10px] font-semibold uppercase">{t('Override')}</Text> : null}
                </View>
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
