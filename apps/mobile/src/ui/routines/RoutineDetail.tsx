import { View, Text } from 'react-native';
import { useSelector } from 'react-redux';
import type { Routine } from '@beyou/types/routine/routine';
import type { RoutineSection } from '@beyou/types/routine/routineSection';
import BeyouIcon from '../BeyouIcon';
import type { RootState } from '../../store';

const fmt = (s?: string) => (s ? s.slice(0, 5) : '');

type Merged = { type: 'habit' | 'task'; id: string; startTime: string };

function mergeItems(section: RoutineSection): Merged[] {
  const habits: Merged[] = (section.habitGroup ?? []).map((g) => ({ type: 'habit', id: g.habitId, startTime: g.startTime }));
  const tasks: Merged[] = (section.taskGroup ?? []).map((g) => ({ type: 'task', id: g.taskId, startTime: g.startTime }));
  return [...habits, ...tasks].sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));
}

export default function RoutineDetail({ routine }: { routine: Routine }) {
  const habits = useSelector((s: RootState) => s.habits.habits);
  const tasks = useSelector((s: RootState) => s.tasks.tasks);
  return (
    <View className="gap-4" testID="routine-detail">
      {routine.routineSections?.map((section, i) => (
        <View key={section.id ?? i} className="rounded-2xl border border-primary/20 bg-background p-4">
          <View className="flex-row flex-wrap items-center gap-1.5">
            <BeyouIcon id={section.iconId} size={18} />
            <Text className="text-primary shrink text-lg font-bold">{section.name}</Text>
            <Text className="text-description shrink-0 text-sm">
              {[fmt(section.startTime), fmt(section.endTime)].filter(Boolean).join(' - ')}
            </Text>
          </View>
          {mergeItems(section).map((item) => {
            const resolved = item.type === 'habit'
              ? habits?.find((h) => h.id === item.id)
              : tasks?.find((tk) => tk.id === item.id);
            if (!resolved) return null;
            return (
              <View key={`${item.type}-${item.id}`} className="mt-2 flex-row items-center gap-2">
                <BeyouIcon id={resolved.iconId} size={16} />
                <Text className="text-secondary flex-1 text-sm">{resolved.name}</Text>
                <Text className="text-description text-xs">{fmt(item.startTime)}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
