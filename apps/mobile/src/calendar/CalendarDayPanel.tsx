import type { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BookHeart, Flag, Plus, Repeat } from 'lucide-react-native';
import { moodLabelKey, splitTasksByTime } from '@beyou/state';
import type {
  CalendarDay,
  CalendarGoalDue,
  CalendarRoutineDay,
  CalendarTask,
} from '@beyou/types/calendar/calendar';
import BeyouIcon from '../ui/BeyouIcon';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Chip from '../ui/Chip';
import IconTile from '../ui/IconTile';
import { MOOD_FACES } from '../ui/mood/moodScale';
import { useBeyouTheme } from '../theme/ThemeProvider';
import CalendarTaskRow from './CalendarTaskRow';
import { isDayEmpty, moodLevelOf, noonOf } from './calendarDay';

interface CalendarDayPanelProps {
  day: CalendarDay;
  today: string;
  /** Month lists the day in one column; week splits it into all-day and timed (R14). */
  layout: 'month' | 'week';
  pendingTaskId: string | null;
  onToggleTask: (task: CalendarTask) => void;
  onEditTask: (task: CalendarTask) => void;
  onAddTask: (date: string) => void;
}

/**
 * The selected day: its calendar tasks, the routine (with how it went, once the day has a
 * record), goals ending that day and the mood with its diary flag (R15, R16).
 */
export default function CalendarDayPanel({
  day,
  today,
  layout,
  pendingTaskId,
  onToggleTask,
  onEditTask,
  onAddTask,
}: CalendarDayPanelProps) {
  const { t, i18n } = useTranslation();
  const past = day.date < today;
  const heading = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(noonOf(day.date));

  const taskRow = (task: CalendarTask, timeColumn = false) => (
    <CalendarTaskRow
      key={task.id}
      task={task}
      past={past}
      pending={pendingTaskId === task.id}
      onToggle={onToggleTask}
      onEdit={onEditTask}
      timeColumn={timeColumn}
    />
  );

  const dayWide = (tasks: CalendarTask[]) => (
    <>
      {tasks.map((task) => taskRow(task))}
      {day.routines.map((routine) => (
        <RoutineLine key={routine.routineId} routine={routine} />
      ))}
      {day.goals.map((goal) => (
        <GoalLine key={goal.goalId} goal={goal} />
      ))}
      <MoodLine day={day} />
    </>
  );

  let body: ReactNode;
  if (layout === 'month') {
    body = isDayEmpty(day) ? (
      <Text className="py-3 text-center text-[12.5px] text-text-3" testID="calendar-day-empty">
        {t('CalendarDayEmpty')}
      </Text>
    ) : (
      <View className="gap-0.5" testID="calendar-day-list">
        {dayWide(day.tasks)}
      </View>
    );
  } else {
    const { timed, untimed } = splitTasksByTime(day.tasks);
    const allDayEmpty =
      untimed.length === 0 && day.routines.length === 0 && day.goals.length === 0 && !day.mood;
    body = (
      <View className="gap-3">
        <View testID="calendar-allday">
          <SectionLabel text={t('CalendarAllDay')} />
          {allDayEmpty ? (
            <Text className="py-2 text-[12.5px] text-text-3">{t('CalendarDayEmpty')}</Text>
          ) : (
            <View className="gap-0.5">{dayWide(untimed)}</View>
          )}
        </View>
        <View testID="calendar-timed">
          <SectionLabel text={t('CalendarMobileTimedHeading')} />
          {timed.length === 0 ? (
            <Text className="py-2 text-[12.5px] text-text-3">{t('CalendarMobileNoTimedTasks')}</Text>
          ) : (
            <View className="gap-0.5">{timed.map((task) => taskRow(task, true))}</View>
          )}
        </View>
      </View>
    );
  }

  return (
    <Card className="px-[18px] py-4" testID="calendar-day-panel">
      <View className="mb-2 flex-row items-center justify-between gap-2">
        <Text
          accessibilityRole="header"
          className="min-w-0 flex-1 text-[15px] font-semibold text-text"
          numberOfLines={1}
          testID="calendar-selected-date"
        >
          {heading}
        </Text>
        {day.date === today ? (
          <Chip size="sm" variant="accent">
            {t('CalendarToday')}
          </Chip>
        ) : null}
      </View>

      {body}

      <AddButton onPress={() => onAddTask(day.date)} label={t('CalendarAddTaskOnDay')} />
    </Card>
  );
}

function AddButton({ onPress, label }: { onPress: () => void; label: string }) {
  const { theme } = useBeyouTheme();
  return (
    <Button
      text={label}
      mode="tonal"
      size="block"
      icon={<Plus size={16} color={theme.accent} />}
      onPress={onPress}
      className="mt-3"
      testID="calendar-add-on-day"
    />
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <Text className="mb-1 font-mono text-[10.5px] uppercase tracking-wide text-text-3">{text}</Text>
  );
}

/**
 * A recorded day says how it went ("7 of 9", and "Completed" when it was); a day not lived yet
 * shows the routine its weekday schedule assigns, marked "Planned", with no count (R16, AE7).
 */
function RoutineLine({ routine }: { routine: CalendarRoutineDay }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const recorded = routine.source === 'SNAPSHOT';
  return (
    <View className="min-h-11 flex-row items-center gap-2.5 py-1" testID={`calendar-routine-${routine.routineId}`}>
      <IconTile size={30}>
        {routine.iconId ? (
          <BeyouIcon id={routine.iconId} size={16} showFallback />
        ) : (
          <Repeat size={15} color={theme.accent} />
        )}
      </IconTile>
      <Text className="min-w-0 flex-1 text-[13.5px] font-medium text-text" numberOfLines={1}>
        {routine.name}
      </Text>
      {recorded && routine.totalItems != null ? (
        <Text
          className="font-mono text-[12px] text-text-2"
          testID={`calendar-routine-progress-${routine.routineId}`}
        >
          {t('CalendarRoutineProgress', {
            checked: routine.checkedItems ?? 0,
            total: routine.totalItems,
          })}
        </Text>
      ) : null}
      {recorded && routine.completed ? (
        <Chip size="sm" variant="ok">
          {t('CalendarRoutineCompleted')}
        </Chip>
      ) : null}
      {!recorded ? (
        <Chip size="sm" variant="neutral" testID={`calendar-routine-planned-${routine.routineId}`}>
          {t('CalendarRoutinePlanned')}
        </Chip>
      ) : null}
    </View>
  );
}

function GoalLine({ goal }: { goal: CalendarGoalDue }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  return (
    <View className="min-h-11 flex-row items-center gap-2.5 py-1" testID={`calendar-goal-${goal.goalId}`}>
      <IconTile size={30}>
        {goal.iconId ? (
          <BeyouIcon id={goal.iconId} size={16} showFallback />
        ) : (
          <Flag size={15} color={theme.flame} />
        )}
      </IconTile>
      <View className="min-w-0 flex-1">
        <Text className="text-[13.5px] font-medium text-text" numberOfLines={1}>
          {goal.name}
        </Text>
        <Text className="text-[11.5px] text-text-3">{t('CalendarGoalEnds')}</Text>
      </View>
      {goal.complete ? (
        <Chip size="sm" variant="ok">
          {t('Completed')}
        </Chip>
      ) : null}
    </View>
  );
}

function MoodLine({ day }: { day: CalendarDay }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const level = moodLevelOf(day);
  if (!level || !day.mood) return null;
  const { Icon, color } = MOOD_FACES[level];
  return (
    <View className="min-h-11 flex-row items-center gap-2.5 py-1" testID="calendar-mood">
      <IconTile size={30} tone="neutral">
        <Icon size={18} color={color(theme)} />
      </IconTile>
      <View className="min-w-0 flex-1">
        <Text className="text-[13.5px] font-medium text-text">{t(moodLabelKey(level))}</Text>
        <Text className="text-[11.5px] text-text-3">{t('CalendarMood')}</Text>
      </View>
      {day.mood.hasNote ? (
        <View className="flex-row items-center gap-1" testID="calendar-mood-diary">
          <BookHeart size={13} color={theme.text3} />
          <Text className="text-[11.5px] text-text-3">{t('CalendarDiaryWritten')}</Text>
        </View>
      ) : null}
    </View>
  );
}
