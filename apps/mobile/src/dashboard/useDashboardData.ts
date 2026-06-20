import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import getProfile from '@beyou/api/user/getProfile';
import getTodayRoutine from '@beyou/api/routine/getTodayRoutine';
import getHabits from '@beyou/api/habits/getHabits';
import getTasks from '@beyou/api/tasks/getTasks';
import getGoals from '@beyou/api/goals/getGoals';
import getCategories from '@beyou/api/categories/getCategories';
import { hydratePerfil } from '@beyou/state/user/perfilSlice';
import { enterTodayRoutine } from '@beyou/state/routine/todayRoutineSlice';
import { enterHabits } from '@beyou/state/habit/habitsSlice';
import { enterTasks } from '@beyou/state/task/tasksSlice';
import { enterGoals } from '@beyou/state/goal/goalsSlice';
import { enterCategories } from '@beyou/state/category/categoriesSlice';
import type { AppDispatch } from '../store';

export interface DashboardData {
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Loads everything the dashboard needs on mount, in parallel (mirrors the web
 * dashboard's Promise.all): the profile (hydrates the perfil slice) plus today's
 * routine, habits, tasks, goals and categories. Each result is dispatched into
 * its shared @beyou/state slice. Failures surface via `error` without throwing.
 */
export function useDashboardData(): DashboardData {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [profileRes, routineRes, habitsRes, tasksRes, goalsRes, catsRes] = await Promise.all([
        getProfile(),
        getTodayRoutine(t),
        getHabits(t),
        getTasks(t),
        getGoals(t),
        getCategories(t),
      ]);

      if (profileRes.data) dispatch(hydratePerfil(profileRes.data));
      if (routineRes.success) dispatch(enterTodayRoutine(routineRes.success));
      if (habitsRes.success) dispatch(enterHabits(habitsRes.success));
      if (tasksRes.success) dispatch(enterTasks(tasksRes.success));
      if (goalsRes.success) dispatch(enterGoals(goalsRes.success));
      if (catsRes.success) dispatch(enterCategories(catsRes.success));
    } catch {
      setError(t('UnexpectedError'));
    } finally {
      setLoading(false);
    }
  }, [dispatch, t]);

  useEffect(() => {
    load();
  }, [load]);

  return { loading, error, reload: load };
}
