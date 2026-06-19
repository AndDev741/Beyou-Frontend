import { View, Text, Pressable } from 'react-native';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { RoutineSection } from '@beyou/types/routine/routineSection';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import RoutineItem, { type MergedItem } from './RoutineItem';
import type { RootState } from '../../store';

const fmt = (s?: string) => (s ? s.slice(0, 5) : '');

/** Flatten a section's habit + task groups into one start-time-sorted list. */
function mergeItems(section: RoutineSection): MergedItem[] {
  const tasks: MergedItem[] = (section.taskGroup ?? []).map((g) => ({
    type: 'task',
    id: g.taskId,
    groupId: g.id ?? '',
    startTime: g.startTime,
    endTime: g.endTime,
    check: g.taskGroupChecks,
  }));
  const habits: MergedItem[] = (section.habitGroup ?? []).map((g) => ({
    type: 'habit',
    id: g.habitId,
    groupId: g.id ?? '',
    startTime: g.startTime,
    endTime: g.endTime,
    check: g.habitGroupChecks,
  }));
  return [...tasks, ...habits].sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));
}

function EmptyRoutine() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useBeyouTheme();
  return (
    <View className="items-center rounded-2xl border border-primary bg-background p-6" testID="routine-empty">
      <Ionicons name="calendar-outline" size={36} color={theme.icon} />
      <Text className="text-description mt-3 text-center text-base font-semibold">
        {t('No Routines Scheduled for today')}
      </Text>
      <Pressable
        onPress={() => router.push('/routines')}
        accessibilityRole="button"
        testID="routine-empty-cta"
        className="mt-4 rounded-md border border-primary px-5 py-2"
      >
        <Text className="text-primary font-semibold">{t('Routines')}</Text>
      </Pressable>
    </View>
  );
}

export default function RoutineDay() {
  const routine = useSelector((s: RootState) => s.todayRoutine.routine);
  const allHabits = useSelector((s: RootState) => s.habits.habits);
  const allTasks = useSelector((s: RootState) => s.tasks.tasks);

  if (!routine) return <EmptyRoutine />;

  const today = new Date().toJSON().slice(0, 10);

  return (
    <View className="rounded-2xl border border-primary bg-background p-4" testID="routine-day">
      <Text className="text-secondary mb-3 text-2xl font-semibold">{routine.name}</Text>

      {routine.routineSections?.map((section, sIdx) => {
        const items = mergeItems(section);
        return (
          <View key={section.id ?? sIdx} className="mb-4 w-full">
            <View className="flex-row items-center">
              <Text className="text-primary text-lg font-bold">{section.name}</Text>
              <Text className="text-description ml-2 text-sm">
                {[fmt(section.startTime), fmt(section.endTime)].filter(Boolean).join(' - ')}
              </Text>
            </View>

            {items.map((item) => {
              const resolved =
                item.type === 'habit'
                  ? allHabits?.find((h) => h.id === item.id)
                  : allTasks?.find((t) => t.id === item.id);
              if (!resolved) return null;
              return (
                <RoutineItem
                  key={`${item.type}-${item.groupId}`}
                  routineId={routine.id ?? ''}
                  item={item}
                  name={resolved.name}
                  motivationalPhrase={item.type === 'habit' ? allHabits?.find((h) => h.id === item.id)?.motivationalPhrase : undefined}
                  today={today}
                />
              );
            })}
          </View>
        );
      })}
    </View>
  );
}
