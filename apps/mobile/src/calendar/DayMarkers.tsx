import { View, Text } from 'react-native';
import type { CalendarDay } from '@beyou/types/calendar/calendar';
import { MOOD_FACES } from '../ui/mood/moodScale';
import { useBeyouTheme } from '../theme/ThemeProvider';
import { moodLevelOf, routineStateOf } from './calendarDay';

interface DayMarkersProps {
  day: CalendarDay;
  /** Prefix for the markers' testIDs (`<prefix>-tasks`, `-routine`, `-goal`, `-mood`). */
  testIDPrefix: string;
}

const DOT = 6;

/**
 * What a day holds, at a glance, under its number: how many tasks, then one dot each for the
 * routine, a goal deadline and the mood.
 *
 * Colours carry meaning the rest of the app already gives them: accent for tasks, success for a
 * finished routine (a muted dot for one recorded but unfinished, an outline for one only planned),
 * flame for a goal ending, and the mood's own face colour. The row keeps a fixed height so cells
 * with and without markers line up.
 */
export default function DayMarkers({ day, testIDPrefix }: DayMarkersProps) {
  const { theme } = useBeyouTheme();
  const taskCount = day.tasks.length;
  const openTasks = day.tasks.filter((task) => !task.completed).length;
  const routine = routineStateOf(day);
  const moodLevel = moodLevelOf(day);

  return (
    <View
      className="h-3.5 flex-row items-center justify-center gap-[3px]"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {taskCount > 0 ? (
        <View
          className={`h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 ${
            openTasks > 0 ? 'bg-accent' : 'bg-surface-2'
          }`}
        >
          <Text
            className={`font-mono-semibold text-[9px] ${openTasks > 0 ? 'text-on-accent' : 'text-text-3'}`}
            testID={`${testIDPrefix}-tasks`}
          >
            {taskCount}
          </Text>
        </View>
      ) : null}
      {routine ? (
        <View
          testID={`${testIDPrefix}-routine`}
          style={{
            width: DOT,
            height: DOT,
            borderRadius: DOT / 2,
            backgroundColor:
              routine === 'done' ? theme.success : routine === 'recorded' ? theme.text3 : 'transparent',
            borderWidth: routine === 'planned' ? 1 : 0,
            borderColor: theme.text3,
          }}
        />
      ) : null}
      {day.goals.length > 0 ? (
        <View
          testID={`${testIDPrefix}-goal`}
          style={{ width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: theme.flame }}
        />
      ) : null}
      {moodLevel ? (
        <View
          testID={`${testIDPrefix}-mood`}
          style={{
            width: DOT,
            height: DOT,
            borderRadius: DOT / 2,
            backgroundColor: MOOD_FACES[moodLevel].color(theme),
          }}
        />
      ) : null}
    </View>
  );
}
