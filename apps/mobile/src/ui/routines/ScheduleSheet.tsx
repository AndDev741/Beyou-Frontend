import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { X } from 'lucide-react-native';
import createSchedule from '@beyou/api/schedule/createSchedule';
import editSchedule from '@beyou/api/schedule/editSchedule';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import type { Routine } from '@beyou/types/routine/routine';
import Button from '../Button';
import BottomSheet from '../BottomSheet';
import { DAYS } from './ScheduleIndicator';
import { notify } from '../../notify';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import type { RootState } from '../../store';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const WEEKEND = ['Saturday', 'Sunday'];
const ALL = DAYS.map((d) => d.wire);
// Display order: Sunday first, like the chips on the routine card.
const WEEK_ORDER = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

interface ScheduleSheetProps {
  visible: boolean;
  routine: Routine;
  onClose: () => void;
  onSaved: () => void;
}

/** Group chip (Mon-Fri / Weekend / All week). */
function GroupChip({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      testID={testID}
      className={`rounded-full border px-3 py-1 ${
        active ? 'border-accent bg-accent-soft' : 'border-border'
      }`}
    >
      <Text className={`text-[11.5px] font-semibold ${active ? 'text-accent' : 'text-text-3'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Schedule a routine, in the web modal's design: the whole week in one row of
 * seven squares, the group chips below and the actions at the foot.
 *
 * It used to be seven full-width rows, one per day — the week did not land in one
 * glance and the panel ran past half the screen. A day another routine already
 * owns is marked on the square itself and gains a row with "Override day",
 * instead of the system `Alert.alert` (which carries no theme, and not the
 * routine's name in the place where the decision is made).
 */
export default function ScheduleSheet({ visible, routine, onClose, onSaved }: ScheduleSheetProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
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

  // day -> names of OTHER routines already scheduled that day (conflict).
  const blockedByDay = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const r of allRoutines) {
      if (r.id === routine.id) continue;
      for (const d of r.schedule?.days ?? []) {
        if (!map[d]) map[d] = [];
        map[d].push(r.name);
      }
    }
    return map;
  }, [allRoutines, routine.id]);

  // Keep canonical Mon..Sun order on save regardless of tap order.
  const ordered = (list: string[]) => ALL.filter((d) => list.includes(d));

  const isBlocked = (day: string) => !!blockedByDay[day] && !overrides.has(day);

  const toggle = (day: string) => {
    if (isBlocked(day)) return;
    setDays((cur) => (cur.includes(day) ? cur.filter((d) => d !== day) : ordered([...cur, day])));
  };

  const overrideDay = (day: string) => {
    setOverrides((prev) => new Set(prev).add(day));
    setDays((cur) => (cur.includes(day) ? cur : ordered([...cur, day])));
  };

  // Quick-groups skip blocked (non-overridden) days — those need an explicit override.
  const toggleGroup = (group: string[]) =>
    setDays((cur) => {
      if (group.every((d) => cur.includes(d))) return cur.filter((d) => !group.includes(d));
      const allowed = group.filter((d) => !isBlocked(d));
      return ordered([...new Set([...cur, ...allowed])]);
    });

  const save = async () => {
    setSubmitting(true);
    const payload = ordered(days);
    const res = routine.schedule?.id
      ? await editSchedule(routine.schedule.id, payload, routine.id as string, t)
      : await createSchedule(payload, routine.id as string, t);
    setSubmitting(false);
    if (res.error) {
      notify.error(getFriendlyErrorMessage(t, res.error));
      return;
    }
    if (res.validation) {
      notify.error(res.validation);
      return;
    }
    notify.success(t(routine.schedule?.id ? 'edited successfully' : 'created successfully'));
    onSaved();
    onClose();
  };

  const blockedDays = WEEK_ORDER.filter(isBlocked);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="flex-row items-start gap-3">
        <View className="min-w-0 flex-1">
          <Text
            accessibilityRole="header"
            className="text-base font-semibold tracking-[-0.01em] text-text"
          >
            {t('ScheduleRoutineTitle')}
          </Text>
          <Text className="mt-1 text-[13px] text-text-3">
            {t('ScheduleRoutineSubtitle', { name: routine.name })}
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('Close')}
          className="rounded-control p-1.5"
          testID="schedule-close"
        >
          <X size={16} color={theme.text3} />
        </Pressable>
      </View>

      {/* One row of seven: the whole week lands in a glance, and a day another
          routine already owns is marked on the square itself. */}
      <View className="mt-3.5 flex-row" style={{ gap: 6 }}>
        {WEEK_ORDER.map((day) => {
          const blocked = isBlocked(day);
          const active = days.includes(day);
          return (
            <Pressable
              key={day}
              onPress={() => toggle(day)}
              accessibilityRole="button"
              accessibilityLabel={t(day)}
              accessibilityState={{ selected: active, disabled: blocked }}
              testID={`day-${day}`}
              className={`h-8 flex-1 items-center justify-center rounded-[10px] ${
                active ? 'bg-accent' : blocked ? 'bg-danger/10' : 'bg-surface-2'
              }`}
            >
              <Text
                className={`font-mono-semibold text-[11.5px] ${
                  active ? 'text-on-accent' : blocked ? 'text-danger' : 'text-text-3'
                }`}
              >
                {t(day).charAt(0).toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {blockedDays.length > 0 ? (
        <View className="mt-3 rounded-control border border-danger/30 bg-danger/5 p-2.5">
          <Text className="text-[12.5px] font-semibold text-danger">
            {t('Already scheduled for')}
          </Text>
          {blockedDays.map((day) => (
            <View key={day} className="mt-1.5 flex-row items-center gap-2">
              <Text className="min-w-0 flex-1 text-xs text-text-2" numberOfLines={1}>
                {`${t(day)} · ${(blockedByDay[day] ?? []).join(', ')}`}
              </Text>
              <Pressable
                onPress={() => overrideDay(day)}
                accessibilityRole="button"
                testID={`override-${day}`}
                className="shrink-0 rounded-control bg-accent-soft px-2 py-1"
              >
                <Text className="text-[11.5px] font-semibold text-accent">{t('Override day')}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <View className="mt-3 flex-row flex-wrap gap-1.5">
        <GroupChip
          label={t('Mon - Fri')}
          active={WEEKDAYS.every((d) => days.includes(d))}
          onPress={() => toggleGroup(WEEKDAYS)}
          testID="group-weekdays"
        />
        <GroupChip
          label={t('Weekend')}
          active={WEEKEND.every((d) => days.includes(d))}
          onPress={() => toggleGroup(WEEKEND)}
          testID="group-weekend"
        />
        <GroupChip
          label={t('All week')}
          active={ALL.every((d) => days.includes(d))}
          onPress={() => toggleGroup(ALL)}
          testID="group-all"
        />
      </View>

      <View className="mt-[18px] flex-row justify-end gap-2">
        <Button text={t('Cancel')} mode="ghost" size="auto" onPress={onClose} testID="schedule-cancel" />
        <Button
          text={t('Save schedule')}
          mode="primary"
          size="auto"
          submitting={submitting}
          onPress={save}
          testID="schedule-save"
        />
      </View>
    </BottomSheet>
  );
}
