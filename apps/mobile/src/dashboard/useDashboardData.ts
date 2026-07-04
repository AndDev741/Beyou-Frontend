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
import { localDateKey, readCollection, readKV, writeCollection, writeKV } from '@beyou/offline';
import type { UserType } from '@beyou/types/user/UserType';
import type { Routine } from '@beyou/types/routine/routine';
import type { habit } from '@beyou/types/habit/habitType';
import type { task } from '@beyou/types/tasks/taskType';
import type { goal } from '@beyou/types/goals/goalType';
import type categoryType from '@beyou/types/category/categoryType';
import { getDb } from '../offline/db';
import type { AppDispatch } from '../store';

interface TodayRoutineCache {
  date: string;
  routine: Routine;
}

export interface DashboardData {
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Dashboard data with an offline-first read path: stage 1 hydrates every slice
 * from the SQLite mirror (instant paint, works with no network), stage 2 runs
 * the original parallel fetch and writes fresh payloads through to the mirror.
 * Network failure over a warm cache is silent — that IS offline mode.
 */
export function useDashboardData(): DashboardData {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    let hydratedFromCache = false;
    try {
      const db = await getDb();

      // Stage 1 — SQLite mirror.
      const [cPerfil, cToday, cHabits, cTasks, cGoals, cCats] = await Promise.all([
        readKV<UserType>(db, 'perfil'),
        readKV<TodayRoutineCache>(db, 'todayRoutine'),
        readCollection<habit>(db, 'habits'),
        readCollection<task>(db, 'tasks'),
        readCollection<goal>(db, 'goals'),
        readCollection<categoryType>(db, 'categories'),
      ]);
      if (cPerfil) {
        dispatch(hydratePerfil(cPerfil));
        hydratedFromCache = true;
      }
      if (cToday && cToday.date === localDateKey()) dispatch(enterTodayRoutine(cToday.routine));
      if (cHabits.length) {
        dispatch(enterHabits(cHabits));
        hydratedFromCache = true;
      }
      if (cTasks.length) dispatch(enterTasks(cTasks));
      if (cGoals.length) dispatch(enterGoals(cGoals));
      if (cCats.length) dispatch(enterCategories(cCats));
      if (hydratedFromCache) setLoading(false);

      // Stage 2 — network refresh + write-through (original behavior).
      const [profileRes, routineRes, habitsRes, tasksRes, goalsRes, catsRes] = await Promise.all([
        getProfile(),
        getTodayRoutine(t),
        getHabits(t),
        getTasks(t),
        getGoals(t),
        getCategories(t),
      ]);

      if (profileRes.data) {
        dispatch(hydratePerfil(profileRes.data));
        await writeKV(db, 'perfil', profileRes.data);
      }
      if (routineRes.success && typeof routineRes.success !== 'string') {
        dispatch(enterTodayRoutine(routineRes.success));
        await writeKV(db, 'todayRoutine', {
          date: localDateKey(),
          routine: routineRes.success,
        } satisfies TodayRoutineCache);
      }
      if (Array.isArray(habitsRes.success)) {
        dispatch(enterHabits(habitsRes.success));
        await writeCollection(db, 'habits', habitsRes.success);
      }
      if (Array.isArray(tasksRes.success)) {
        dispatch(enterTasks(tasksRes.success));
        await writeCollection(db, 'tasks', tasksRes.success);
      }
      if (Array.isArray(goalsRes.success)) {
        dispatch(enterGoals(goalsRes.success));
        await writeCollection(db, 'goals', goalsRes.success);
      }
      if (Array.isArray(catsRes.success)) {
        dispatch(enterCategories(catsRes.success));
        await writeCollection(db, 'categories', catsRes.success);
      }
    } catch {
      if (!hydratedFromCache) setError(t('UnexpectedError'));
    } finally {
      setLoading(false);
    }
  }, [dispatch, t]);

  useEffect(() => {
    load();
  }, [load]);

  return { loading, error, reload: load };
}
