import { AppState } from 'react-native';
import { createSyncEngine, type OpHandler } from '@beyou/offline';
import { getLogger } from '@beyou/api';
import { applyRefreshUi } from '@beyou/state/user/refreshUiThunk';
import type { Routine } from '@beyou/types/routine/routine';
import type { itemGroupToCheck } from '@beyou/types/routine/itemGroupToCheck';
import type { itemGroupToSkip } from '@beyou/types/routine/itemGroupToSkip';

import createHabit from '@beyou/api/habits/createHabit';
import editHabit from '@beyou/api/habits/editHabit';
import deleteHabit from '@beyou/api/habits/deleteHabit';
import createCategory from '@beyou/api/categories/createCategory';
import editCategory from '@beyou/api/categories/editCategory';
import deleteCategory from '@beyou/api/categories/deleteCategory';
import createTask from '@beyou/api/tasks/createTask';
import editTask from '@beyou/api/tasks/editTask';
import deleteTask from '@beyou/api/tasks/deleteTask';
import createGoal from '@beyou/api/goals/createGoal';
import editGoal from '@beyou/api/goals/editGoal';
import deleteGoal from '@beyou/api/goals/deleteGoal';
import increaseCurrentValue from '@beyou/api/goals/increaseCurrentValue';
import decreaseCurrentValue from '@beyou/api/goals/decreaseCurrentValue';
import markGoalAsComplete from '@beyou/api/goals/markGoalAsComplete';
import createRoutine from '@beyou/api/routine/createRoutine';
import editRoutine from '@beyou/api/routine/editRoutine';
import deleteRoutine from '@beyou/api/routine/deleteRoutine';
import createSchedule from '@beyou/api/schedule/createSchedule';
import editSchedule from '@beyou/api/schedule/editSchedule';
import checkRoutine from '@beyou/api/routine/checkItem';
import skipRoutine from '@beyou/api/routine/skipItem';

import { getDb } from './db';
import { getSyncEngine, setOfflineStore, setSyncEngine } from './mutations';
import { setPendingOps } from './connectivitySlice';
import { notify } from '../notify';
import i18n from '../i18n';
import type { store as appStore } from '../store';

type AppStore = typeof appStore;

/** Reused for every op whose payload is just `{ id }`. */
type IdPayload = { id: string };

/**
 * Narrow an unknown handler-facing error (Error | ApiErrorPayload | string) down
 * to a display string. OpHandler.error must be a string, but the api layer
 * returns three different shapes (goal.increase/decrease throw plain Errors,
 * markGoalAsComplete returns a string, everything else returns ApiErrorPayload).
 */
function errorToString(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return i18n.t('UnexpectedError');
}

/** CRUD result shapes all carry `error` on failure and nothing conclusive otherwise. */
function toResult(res: { error?: unknown }): { ok: boolean; error?: string } {
  if (res.error) return { ok: false, error: errorToString(res.error) };
  return { ok: true };
}

/**
 * One handler per registry-table opType. Exported (not just used by
 * initOfflineSync) so tests can exercise the registry without a real DB/engine.
 * NEVER compute XP locally here: goal.complete / routine.check / routine.skip
 * pipe the server's RefreshUI through the shared applyRefreshUi — the same
 * gamification brain useRoutineCheckin uses online.
 */
export function buildHandlers(store: AppStore): Record<string, OpHandler> {
  const t = i18n.t;
  const previous = () => {
    const p = store.getState().perfil;
    return { level: p.level, constance: p.constance };
  };

  return {
    'habit.create': async (payload) => {
      const p = payload as {
        id: string; name: string; description: string; motivationalPhrase: string;
        importance: number; dificulty: number; iconId: string; experience: number; categoriesId: string[];
      };
      const res = await createHabit(p.name, p.description, p.motivationalPhrase, p.importance, p.dificulty, p.iconId, p.experience, p.categoriesId, t, p.id);
      return toResult(res);
    },
    'habit.edit': async (payload) => {
      const p = payload as {
        habitId: string; name: string; description: string; motivationalPhrase: string;
        iconId: string; importance: number; dificulty: number; categoriesId: string[];
      };
      const res = await editHabit(p.habitId, p.name, p.description, p.motivationalPhrase, p.iconId, p.importance, p.dificulty, p.categoriesId, t);
      return toResult(res);
    },
    'habit.delete': async (payload) => {
      const p = payload as IdPayload;
      return toResult(await deleteHabit(p.id, t));
    },

    'category.create': async (payload) => {
      const p = payload as { id: string; name: string; description: string; experience: number; icon: string };
      const res = await createCategory(p.name, p.description, p.experience, p.icon, t, p.id);
      return toResult(res);
    },
    'category.edit': async (payload) => {
      const p = payload as { categoryId: string; name: string; description: string; icon: string };
      const res = await editCategory(p.categoryId, p.name, p.description, p.icon, t);
      return toResult(res);
    },
    'category.delete': async (payload) => {
      const p = payload as IdPayload;
      return toResult(await deleteCategory(p.id, t));
    },

    'task.create': async (payload) => {
      const p = payload as {
        id: string; name: string; description: string; iconId: string; categoriesId: string[];
        importance?: number; difficulty?: number; oneTimeTask: boolean;
      };
      const res = await createTask(p.name, p.description, p.iconId, p.categoriesId, t, p.importance, p.difficulty, p.oneTimeTask, p.id);
      return toResult(res);
    },
    'task.edit': async (payload) => {
      const p = payload as {
        taskId: string; name: string; description: string; iconId: string;
        importance: number; difficulty: number; categoriesId: string[]; oneTimeTask: boolean;
      };
      const res = await editTask(p.taskId, p.name, p.description, p.iconId, p.importance, p.difficulty, p.categoriesId, p.oneTimeTask, t);
      return toResult(res);
    },
    'task.delete': async (payload) => {
      const p = payload as IdPayload;
      return toResult(await deleteTask(p.id, t));
    },

    'goal.create': async (payload) => {
      const p = payload as {
        id: string; title: string; iconId: string; description: string; targetValue: number; unit: string;
        currentValue: number; categoriesId: string[]; motivation: string; startDate: string; endDate: string;
        status: string; term: string;
      };
      const res = await createGoal(p.title, p.iconId, p.description, p.targetValue, p.unit, p.currentValue, p.categoriesId, p.motivation, p.startDate, p.endDate, p.status, p.term, t, p.id);
      return toResult(res);
    },
    'goal.edit': async (payload) => {
      const p = payload as {
        goalId: string; title: string; iconId: string; description: string; targetValue: number; unit: string;
        currentValue: number; complete: boolean; categoriesId: string[]; motivation: string; startDate: string;
        endDate: string; status: string; term: string;
      };
      const res = await editGoal(p.goalId, p.title, p.iconId, p.description, p.targetValue, p.unit, p.currentValue, p.complete, p.categoriesId, p.motivation, p.startDate, p.endDate, p.status, p.term, t);
      return toResult(res);
    },
    'goal.delete': async (payload) => {
      const p = payload as IdPayload;
      return toResult(await deleteGoal(p.id, t));
    },
    // increase/decrease THROW instead of returning {error} — wrap explicitly.
    'goal.increase': async (payload) => {
      const p = payload as IdPayload;
      try {
        await increaseCurrentValue(p.id, t);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: errorToString(e) };
      }
    },
    'goal.decrease': async (payload) => {
      const p = payload as IdPayload;
      try {
        await decreaseCurrentValue(p.id, t);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: errorToString(e) };
      }
    },
    'goal.complete': async (payload) => {
      const p = payload as IdPayload;
      const res = await markGoalAsComplete(p.id, t);
      if (res.error) return { ok: false, error: errorToString(res.error) };
      applyRefreshUi(res.success, store.dispatch, previous());
      return { ok: true };
    },

    'routine.create': async (payload) => {
      const p = payload as { routine: Routine };
      return toResult(await createRoutine(p.routine, t));
    },
    'routine.edit': async (payload) => {
      const p = payload as { routine: Routine };
      return toResult(await editRoutine(p.routine, t));
    },
    'routine.delete': async (payload) => {
      const p = payload as IdPayload;
      return toResult(await deleteRoutine(p.id, t));
    },
    'routine.check': async (payload) => {
      const p = payload as { dto: itemGroupToCheck; date: string };
      const res = await checkRoutine(p.dto, t, p.date);
      if (res.error) return { ok: false, error: errorToString(res.error) };
      applyRefreshUi(res.success, store.dispatch, previous());
      return { ok: true };
    },
    'routine.skip': async (payload) => {
      const p = payload as { dto: itemGroupToSkip; date: string };
      const res = await skipRoutine(p.dto, t, p.date);
      if (res.error) return { ok: false, error: errorToString(res.error) };
      applyRefreshUi(res.success, store.dispatch, previous());
      return { ok: true };
    },

    'schedule.create': async (payload) => {
      const p = payload as { days: string[]; routineId: string };
      return toResult(await createSchedule(p.days, p.routineId, t));
    },
    'schedule.edit': async (payload) => {
      const p = payload as { scheduleId: string; days: string[]; routineId: string };
      return toResult(await editSchedule(p.scheduleId, p.days, p.routineId, t));
    },
  };
}

let started = false;

/**
 * Boots the offline sync subsystem: registers the store with the mirror-write
 * helpers, opens the SQLite outbox, builds the handler registry, and wires the
 * count/toast callbacks. Idempotent — safe to call from every render of the
 * root layout's mount effect. A failure here (e.g. SQLite init) is logged and
 * swallowed: the app must keep working online, it just won't sync offline ops.
 */
export async function initOfflineSync(store: AppStore): Promise<void> {
  if (started) return;
  started = true;
  try {
    setOfflineStore(store);
    const db = await getDb();
    const engine = createSyncEngine({
      db,
      handlers: buildHandlers(store),
      onCountChange: (n) => store.dispatch(setPendingOps(n)),
      onFlushEnd: ({ flushed, dropped }) => {
        if (flushed > 0) notify.success(i18n.t('OfflineSyncedToast', { count: flushed }));
        if (dropped > 0) notify.error(i18n.t('OfflineSyncFailedToast', { count: dropped }));
      },
    });
    setSyncEngine(engine);
    AppState.addEventListener('change', (state) => {
      if (state === 'active') void flushOutbox();
    });
  } catch (e) {
    getLogger().error('initOfflineSync failed', e);
  }
}

/** Safe no-op when the engine hasn't been configured yet (setup failed or hasn't run). */
export async function flushOutbox(): Promise<void> {
  const engine = getSyncEngine();
  if (!engine) return;
  await engine.flush();
}
