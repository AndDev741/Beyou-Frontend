import type { TFunction } from 'i18next';
import createRoutine from '@beyou/api/routine/createRoutine';
import editRoutine from '@beyou/api/routine/editRoutine';
import deleteRoutine from '@beyou/api/routine/deleteRoutine';
import createSchedule from '@beyou/api/schedule/createSchedule';
import editSchedule from '@beyou/api/schedule/editSchedule';
import { enterRoutines } from '@beyou/state/routine/routinesSlice';
import { upsertRow, deleteRow } from '@beyou/offline';
import type { Routine } from '@beyou/types/routine/routine';
import { uuidv4 } from '../../lib/uuid';
import { getOfflineStore, isOffline, queueMutation } from '../mutations';

type MutationResult = { success?: unknown; error?: unknown; validation?: string; queued?: boolean };

export async function createRoutineOffline(routine: Routine, t: TFunction): Promise<MutationResult> {
  if (!isOffline()) {
    return createRoutine(routine, t) as Promise<MutationResult>;
  }
  const store = getOfflineStore();
  // Client id becomes the real server PK at replay (backend honors a client-supplied
  // id on create — P2-T1). The local entity is just the passed-in Routine plus this id.
  const local: Routine = { ...routine, id: routine.id ?? uuidv4() };
  store.dispatch(enterRoutines([...store.getState().routines.routines, local]));
  // ponytail: offline-created routines can't be checked until first sync (their
  // schedule lands server-side at replay; todayRoutine is server-generated)
  await queueMutation({
    opType: 'routine.create',
    payload: { routine: local },
    entityId: local.id,
    mirror: (db) => upsertRow(db, 'routines', local),
  });
  return { success: local, queued: true };
}

export async function editRoutineOffline(routine: Routine, t: TFunction): Promise<MutationResult> {
  if (!isOffline()) {
    return editRoutine(routine, t) as Promise<MutationResult>;
  }
  const store = getOfflineStore();
  store.dispatch(
    enterRoutines(store.getState().routines.routines.map((r) => (r.id === routine.id ? routine : r)))
  );
  await queueMutation({
    opType: 'routine.edit',
    payload: { routine },
    entityId: routine.id,
    mirror: (db) => upsertRow(db, 'routines', routine),
  });
  return { success: routine, queued: true };
}

export async function deleteRoutineOffline(routineId: string, t: TFunction): Promise<MutationResult> {
  if (!isOffline()) {
    return deleteRoutine(routineId, t) as Promise<MutationResult>;
  }
  const store = getOfflineStore();
  store.dispatch(enterRoutines(store.getState().routines.routines.filter((r) => r.id !== routineId)));
  await queueMutation({
    opType: 'routine.delete',
    payload: { id: routineId },
    entityId: routineId,
    mirror: (db) => deleteRow(db, 'routines', routineId),
  });
  return { success: true, queued: true };
}

/**
 * Schedules keep server-generated ids — no client id is minted here, and there is
 * no redux/mirror write (unlike the routine/habit/category/task ops above): the
 * ScheduleSheet always refetches routines, which carry `schedule.days`, after save.
 */
export async function createScheduleOffline(
  days: string[],
  routineId: string,
  t: TFunction
): Promise<MutationResult> {
  if (!isOffline()) {
    return createSchedule(days, routineId, t) as Promise<MutationResult>;
  }
  // ponytail: an offline schedule.create followed by an offline edit of that same
  // schedule is unsupported in v1 — ScheduleSheet only edits a schedule it already
  // knows the id of from the last server-fetched routines payload; a brand-new
  // offline schedule just shows pending until this op replays and the real id
  // comes back from the server.
  await queueMutation({
    opType: 'schedule.create',
    payload: { days, routineId },
    entityId: routineId,
  });
  return { queued: true };
}

export async function editScheduleOffline(
  scheduleId: string,
  days: string[],
  routineId: string,
  t: TFunction
): Promise<MutationResult> {
  if (!isOffline()) {
    return editSchedule(scheduleId, days, routineId, t) as Promise<MutationResult>;
  }
  await queueMutation({
    opType: 'schedule.edit',
    payload: { scheduleId, days, routineId },
    entityId: routineId,
  });
  return { queued: true };
}
