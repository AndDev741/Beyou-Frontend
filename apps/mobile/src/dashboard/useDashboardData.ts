import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { getLogger } from '@beyou/api';
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
import { getDb, getCacheGeneration } from '../offline/db';
import type { AppDispatch } from '../store';

interface TodayRoutineCache {
  date: string;
  routine: Routine | null;
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
 *
 * If SQLite init itself fails (disk full, corrupt DB, ...), stage 1 is skipped
 * entirely and stage 2 runs network-only with no write-throughs — the screen
 * must never hang or drop network data just because the cache is unavailable.
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
      const db = await getDb().catch((e) => {
        getLogger().error(e);
        return null;
      });

      // A generation captured before any persist below; if clearOfflineCache
      // (logout) bumps it mid-flight, every write-through in this run is
      // skipped so the next account can't inherit this run's fetched data.
      let gen = -1;
      if (db) {
        gen = getCacheGeneration();

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
        if (cToday && cToday.date === localDateKey()) {
          dispatch(enterTodayRoutine(cToday.routine));
          hydratedFromCache = true;
        }
        if (cHabits.length) {
          dispatch(enterHabits(cHabits));
          hydratedFromCache = true;
        }
        if (cTasks.length) {
          dispatch(enterTasks(cTasks));
          hydratedFromCache = true;
        }
        if (cGoals.length) {
          dispatch(enterGoals(cGoals));
          hydratedFromCache = true;
        }
        if (cCats.length) {
          dispatch(enterCategories(cCats));
          hydratedFromCache = true;
        }
        if (hydratedFromCache) setLoading(false);
      }

      // Stage 2 — network refresh + best-effort write-through (original behavior).
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
        if (db && gen === getCacheGeneration()) {
          await writeKV(db, 'perfil', profileRes.data).catch(() => {});
        }
      }
      if (routineRes.success && typeof routineRes.success !== 'string') {
        dispatch(enterTodayRoutine(routineRes.success));
        if (db && gen === getCacheGeneration()) {
          await writeKV(db, 'todayRoutine', {
            date: localDateKey(),
            routine: routineRes.success,
          } satisfies TodayRoutineCache).catch(() => {});
        }
      } else if (!routineRes.error) {
        // The fetch genuinely succeeded with no routine scheduled today
        // (backend returns 200 + null body) — clear any stale routine left
        // over from an earlier day or a previous cache write.
        dispatch(enterTodayRoutine(null));
        if (db && gen === getCacheGeneration()) {
          await writeKV(db, 'todayRoutine', {
            date: localDateKey(),
            routine: null,
          } satisfies TodayRoutineCache).catch(() => {});
        }
      }
      if (Array.isArray(habitsRes.success)) {
        dispatch(enterHabits(habitsRes.success));
        if (db && gen === getCacheGeneration()) {
          await writeCollection(db, 'habits', habitsRes.success).catch(() => {});
        }
      }
      if (Array.isArray(tasksRes.success)) {
        dispatch(enterTasks(tasksRes.success));
        if (db && gen === getCacheGeneration()) {
          await writeCollection(db, 'tasks', tasksRes.success).catch(() => {});
        }
      }
      if (Array.isArray(goalsRes.success)) {
        dispatch(enterGoals(goalsRes.success));
        if (db && gen === getCacheGeneration()) {
          await writeCollection(db, 'goals', goalsRes.success).catch(() => {});
        }
      }
      if (Array.isArray(catsRes.success)) {
        dispatch(enterCategories(catsRes.success));
        if (db && gen === getCacheGeneration()) {
          await writeCollection(db, 'categories', catsRes.success).catch(() => {});
        }
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
