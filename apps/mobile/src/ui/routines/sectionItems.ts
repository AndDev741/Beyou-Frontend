import type { RoutineSection } from '@beyou/types/routine/routineSection';
import type { habit } from '@beyou/types/habit/habitType';
import type { task } from '@beyou/types/tasks/taskType';

export interface MergedSectionItem {
  key: string;
  type: 'habit' | 'task';
  refId: string;
  name: string;
  iconId: string;
  startTime: string;
  endTime: string;
}

// Empty times sort last (a high sentinel beats any "HH:mm").
const timeRank = (s: string) => (s ? s : '~~~~~');

/** Merge a section's habit + task groups into one display list, resolving
 *  name/icon from the loaded habits/tasks and sorting by start time then name. */
export function mergeSectionItems(
  section: RoutineSection,
  habits: habit[],
  tasks: task[],
): MergedSectionItem[] {
  const hMap = new Map(habits.map((h) => [h.id, h]));
  const tMap = new Map(tasks.map((tk) => [tk.id, tk]));
  const items: MergedSectionItem[] = [
    ...(section.habitGroup ?? []).map((g) => ({
      key: `habit-${g.habitId}`,
      type: 'habit' as const,
      refId: g.habitId,
      name: hMap.get(g.habitId)?.name ?? '',
      iconId: hMap.get(g.habitId)?.iconId ?? '',
      startTime: g.startTime ?? '',
      endTime: g.endTime ?? '',
    })),
    ...(section.taskGroup ?? []).map((g) => ({
      key: `task-${g.taskId}`,
      type: 'task' as const,
      refId: g.taskId,
      name: tMap.get(g.taskId)?.name ?? '',
      iconId: tMap.get(g.taskId)?.iconId ?? '',
      startTime: g.startTime ?? '',
      endTime: g.endTime ?? '',
    })),
  ];
  return items.sort(
    (a, b) => timeRank(a.startTime).localeCompare(timeRank(b.startTime)) || a.name.localeCompare(b.name),
  );
}

/** "06:00 - 07:00", "06:00", or "" depending on which times are set. */
export const formatItemRange = (startTime: string, endTime: string): string =>
  [startTime, endTime].filter(Boolean).join(' - ');
