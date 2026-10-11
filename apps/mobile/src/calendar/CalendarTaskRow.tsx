import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CalendarTask } from '@beyou/types/calendar/calendar';
import Chip from '../ui/Chip';
import Ring from '../ui/Ring';

interface CalendarTaskRowProps {
  task: CalendarTask;
  /** The task's day is before today, so an open task there was missed (R5). */
  past: boolean;
  /** A completion for this task is in flight. */
  pending?: boolean;
  onToggle: (task: CalendarTask) => void;
  onEdit: (task: CalendarTask) => void;
  /**
   * Shows the time in a column on the left, for the week view's timed list, instead of the chip
   * under the title.
   */
  timeColumn?: boolean;
  /**
   * What a tap on the title does, for screen readers. Defaults to "Edit task"; a row that opens
   * something else (the dashboard card opens the calendar) says so instead.
   */
  openLabel?: string;
}

/**
 * One calendar task: the system ring to complete it, the title to open it.
 *
 * Two touch targets, side by side, each at least 44px tall. A missed task stays on its own day
 * and says so ("Not done") rather than moving to today.
 */
export default function CalendarTaskRow({
  task,
  past,
  pending = false,
  onToggle,
  onEdit,
  timeColumn = false,
  openLabel,
}: CalendarTaskRowProps) {
  const { t } = useTranslation();
  const done = task.completed;
  const missed = past && !done;

  return (
    <View className="flex-row items-center" testID={`calendar-task-${task.id}`}>
      {timeColumn && task.time ? (
        <Text className="w-12 font-mono text-[12.5px] text-text-2" testID={`calendar-task-time-${task.id}`}>
          {task.time}
        </Text>
      ) : null}
      <Pressable
        onPress={() => onToggle(task)}
        disabled={pending}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done, disabled: pending }}
        accessibilityLabel={`${t(done ? 'CalendarTaskUncomplete' : 'CalendarTaskComplete')}: ${task.title}`}
        testID={`calendar-task-check-${task.id}`}
        className="h-11 w-11 shrink-0 items-center justify-center"
      >
        <Ring size={24} state={done ? 'done' : 'todo'} />
      </Pressable>
      <Pressable
        onPress={() => onEdit(task)}
        accessibilityRole="button"
        accessibilityLabel={`${openLabel ?? t('CalendarEditTask')}: ${task.title}`}
        testID={`calendar-task-open-${task.id}`}
        className="min-h-11 min-w-0 flex-1 justify-center gap-1 rounded-control py-1.5 pr-1 active:bg-surface-2"
      >
        <Text
          numberOfLines={2}
          className={`text-[13.5px] font-medium ${done ? 'text-text-3 line-through' : 'text-text'}`}
        >
          {task.title}
        </Text>
        {(task.time && !timeColumn) || missed || (done && task.xpAwarded > 0) ? (
          <View className="flex-row flex-wrap items-center gap-1.5">
            {task.time && !timeColumn ? (
              <Chip size="sm" variant="time">
                {task.time}
              </Chip>
            ) : null}
            {missed ? (
              <Chip size="sm" variant="danger" testID={`calendar-task-missed-${task.id}`}>
                {t('CalendarTaskNotDone')}
              </Chip>
            ) : null}
            {done && task.xpAwarded > 0 ? (
              <Chip size="sm" variant="xp">
                {`+${Math.round(task.xpAwarded)} XP`}
              </Chip>
            ) : null}
          </View>
        ) : null}
        {task.note ? (
          <Text numberOfLines={1} className="text-[12px] text-text-3">
            {task.note}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}
