import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import getTodayRoutine from '@beyou/api/routine/getTodayRoutine';
import getHabits from '@beyou/api/habits/getHabits';
import getTasks from '@beyou/api/tasks/getTasks';
import { enterTodayRoutine } from '@beyou/state/routine/todayRoutineSlice';
import { enterHabits } from '@beyou/state/habit/habitsSlice';
import { enterTasks } from '@beyou/state/task/tasksSlice';
import type { RootState, AppDispatch } from '../store';

/**
 * Everything the focus screen needs, fetched by the screen itself.
 *
 * The web twin is `apps/web/src/pages/focus/useFocusRoutine.ts`, and the pair is deliberate:
 * this repo already keeps `useAutoRefresh` as two files for the same reason. The shared parts
 * (the api calls and the slices) are shared; what differs is the platform's logger and the
 * fact that the native `RoutineDay` fills in the day's progress itself.
 *
 * Three requests, not one. The routine only carries item GROUPS: names and icons come from the
 * habits and tasks slices, and `RoutineDay` renders nothing for a group it cannot resolve. A
 * focus screen opened from a cold start would otherwise draw an empty routine and look broken.
 *
 * It always fetches, and does not try to detect "already loaded". Both slices start as `[]`, so
 * an empty array cannot be told apart from a user who genuinely has no habits. Whatever the
 * store already holds keeps rendering while the requests are in flight, so arriving from the
 * dashboard shows the routine at once and this is only a refresh.
 */
export function useFocusRoutine(): { loading: boolean; error: string | null } {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const routine = useSelector((s: RootState) => s.todayRoutine.routine);
  const [settled, setSettled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const [routineRes, habitsRes, tasksRes] = await Promise.all([
          getTodayRoutine(t),
          getHabits(t),
          getTasks(t),
        ]);
        if (!active) return;
        // Applied one by one: a failed habits call must not throw away a routine that
        // arrived fine. `useAgentRefresh` had to be fixed into this shape once already.
        if (routineRes.success) dispatch(enterTodayRoutine(routineRes.success));
        if (habitsRes.success) dispatch(enterHabits(habitsRes.success));
        if (tasksRes.success) dispatch(enterTasks(tasksRes.success));
        // Any of the three: the routine is only readable WITH its habits and tasks, so a
        // failed habits call leaves sections with no rows in them, which reads as a bug
        // rather than as a failure. First error wins; they are all the same sentence.
        const failure = routineRes.error ?? habitsRes.error ?? tasksRes.error;
        if (failure) setError(String(failure));
      } catch {
        if (active) setError(t('UnexpectedError'));
      } finally {
        if (active) setSettled(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [dispatch, t]);

  return { loading: !settled && routine === null, error };
}
