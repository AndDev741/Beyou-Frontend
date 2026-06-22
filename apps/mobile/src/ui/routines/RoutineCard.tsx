import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { calculateLevelProgress, getRoutineStats } from '@beyou/state';
import type { Routine } from '@beyou/types/routine/routine';
import type { RoutineSection } from '@beyou/types/routine/routineSection';
import BeyouIcon from '../BeyouIcon';
import ScheduleIndicator from './ScheduleIndicator';
import RoutineItem, { type MergedItem } from '../dashboard/RoutineItem';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import type { RootState } from '../../store';

const fmt = (s?: string) => (s ? s.slice(0, 5) : '');

function mergeItems(section: RoutineSection): MergedItem[] {
  const habits: MergedItem[] = (section.habitGroup ?? []).map((g) => ({
    type: 'habit',
    id: g.habitId,
    groupId: g.id ?? '',
    startTime: g.startTime,
    endTime: g.endTime,
    check: g.habitGroupChecks,
  }));
  const tasks: MergedItem[] = (section.taskGroup ?? []).map((g) => ({
    type: 'task',
    id: g.taskId,
    groupId: g.id ?? '',
    startTime: g.startTime,
    endTime: g.endTime,
    check: g.taskGroupChecks,
  }));
  return [...habits, ...tasks].sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));
}

interface RoutineCardProps {
  routine: Routine;
  today: string;
  onSchedule: (r: Routine) => void;
  onEdit: (r: Routine) => void;
  onDelete: (r: Routine) => void;
  onChanged: () => void;
}

export default function RoutineCard({ routine, today, onSchedule, onEdit, onDelete, onChanged }: RoutineCardProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const habits = useSelector((s: RootState) => s.habits.habits);
  const tasks = useSelector((s: RootState) => s.tasks.tasks);
  const [expanded, setExpanded] = useState(false);

  const stats = getRoutineStats(routine, today);
  const levelPct = calculateLevelProgress(routine.xp ?? 0, routine.actualLevelXp ?? 0, routine.nextLevelXp ?? 0);
  const sections = routine.routineSections?.length ?? 0;
  const donePct = stats.totalItems > 0 ? Math.round((stats.completedItems / stats.totalItems) * 100) : 0;

  return (
    <View className="rounded-2xl border border-primary/20 bg-background p-4">
      {/* Header row: icon + name/stats + schedule button */}
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => setExpanded((e) => !e)}
          accessibilityRole="button"
          accessibilityLabel={routine.name}
          accessibilityState={{ expanded }}
          testID={`routine-card-${routine.id}`}
          className="flex-1 flex-row items-center gap-3"
        >
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <BeyouIcon id={routine.iconId} size={24} showFallback />
          </View>
          <View className="flex-1">
            <Text className="text-secondary text-base font-bold" numberOfLines={1}>{routine.name}</Text>
            <Text className="text-description text-xs">
              {sections} {t('Sections')} · {stats.completedItems}/{stats.totalItems} · {donePct}%
            </Text>
          </View>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.description} />
        </Pressable>

        {/* Schedule is a key action — always visible regardless of expand state. */}
        <Pressable
          onPress={() => onSchedule(routine)}
          accessibilityRole="button"
          accessibilityLabel={t('Schedule')}
          testID={`schedule-${routine.id}`}
          className="h-9 w-9 items-center justify-center rounded-full bg-primary/10"
        >
          <Ionicons name="calendar-outline" size={18} color={theme.primary} />
        </Pressable>
      </View>

      {/* Schedule indicator (days) */}
      <View className="mt-2">
        <ScheduleIndicator days={routine.schedule?.days} />
      </View>

      {/* Level / XP progress bar */}
      <View className="mt-2">
        <View className="mb-1 flex-row justify-between">
          <Text className="text-description text-xs">
            {t('Level')} {routine.level ?? 0} · {routine.xp ?? 0}/{routine.nextLevelXp ?? 0} XP
          </Text>
          <Text className="text-description text-xs">{levelPct}%</Text>
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-primary/15">
          <View className="h-full rounded-full bg-primary" style={{ width: `${levelPct}%` }} />
        </View>
      </View>

      {/* Expanded: interactive sections + Edit/Delete */}
      {expanded ? (
        <View className="mt-4 gap-4 border-t border-primary/10 pt-3">
          {routine.routineSections?.map((section, i) => (
            <View key={section.id ?? i}>
              <View className="flex-row flex-wrap items-center gap-1.5">
                <BeyouIcon id={section.iconId} size={16} />
                <Text className="text-primary shrink text-base font-bold">{section.name}</Text>
                <Text className="text-description shrink-0 text-xs">
                  {[fmt(section.startTime), fmt(section.endTime)].filter(Boolean).join(' - ')}
                </Text>
              </View>
              {mergeItems(section).map((item) => {
                const resolved =
                  item.type === 'habit'
                    ? habits?.find((h) => h.id === item.id)
                    : tasks?.find((tk) => tk.id === item.id);
                if (!resolved) return null;
                return (
                  <RoutineItem
                    key={`${item.type}-${item.groupId}`}
                    routineId={routine.id ?? ''}
                    item={item}
                    name={resolved.name}
                    motivationalPhrase={
                      item.type === 'habit'
                        ? (resolved as { motivationalPhrase?: string }).motivationalPhrase
                        : undefined
                    }
                    today={today}
                    onChanged={onChanged}
                  />
                );
              })}
            </View>
          ))}

          <View className="flex-row gap-3">
            <Pressable
              onPress={() => onEdit(routine)}
              accessibilityRole="button"
              testID={`edit-${routine.id}`}
              className="flex-1 items-center rounded-lg bg-primary py-2.5"
            >
              <Text style={{ color: theme.background }} className="font-semibold">{t('Edit')}</Text>
            </Pressable>
            <Pressable
              onPress={() => onDelete(routine)}
              accessibilityRole="button"
              testID={`delete-${routine.id}`}
              className="flex-1 items-center rounded-lg border border-error py-2.5"
            >
              <Text className="text-error font-semibold">{t('Delete')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
