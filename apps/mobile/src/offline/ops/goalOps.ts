import type { TFunction } from 'i18next';
import createGoal from '@beyou/api/goals/createGoal';
import editGoal from '@beyou/api/goals/editGoal';
import deleteGoal from '@beyou/api/goals/deleteGoal';
import increaseCurrentValue from '@beyou/api/goals/increaseCurrentValue';
import decreaseCurrentValue from '@beyou/api/goals/decreaseCurrentValue';
import markGoalAsComplete from '@beyou/api/goals/markGoalAsComplete';
import { enterGoals, updateGoal } from '@beyou/state/goal/goalsSlice';
import { upsertRow, deleteRow } from '@beyou/offline';
import type { goal } from '@beyou/types/goals/goalType';
import type { RefreshUI } from '@beyou/types/refreshUi/refreshUi.type';
import { uuidv4 } from '../../lib/uuid';
import { getOfflineStore, isOffline, queueMutation } from '../mutations';

type MutationResult = { success?: unknown; error?: unknown; validation?: string; queued?: boolean };
type CompleteResult = { success?: RefreshUI; error?: string; queued?: boolean };

export async function createGoalOffline(
  title: string,
  iconId: string,
  description: string,
  targetValue: number,
  unit: string,
  currentValue: number,
  categoriesId: string[],
  motivation: string,
  startDate: string,
  endDate: string,
  status: string,
  term: string,
  t: TFunction
): Promise<MutationResult> {
  if (!isOffline()) {
    return createGoal(title, iconId, description, targetValue, unit, currentValue, categoriesId, motivation, startDate, endDate, status, term, t, undefined) as Promise<MutationResult>;
  }
  const store = getOfflineStore();
  const id = uuidv4();
  // Gamification field (xpReward) is a LOCAL PLACEHOLDER (never trusted): the
  // post-sync pull replaces this row with the server's truth.
  const local = {
    id,
    name: title,
    iconId,
    description,
    targetValue,
    unit,
    currentValue,
    complete: false,
    categories: {},
    motivation,
    startDate,
    endDate,
    xpReward: 0,
    status,
    term,
  } as unknown as goal;
  store.dispatch(enterGoals([...store.getState().goals.goals, local]));
  await queueMutation({
    opType: 'goal.create',
    payload: { id, title, iconId, description, targetValue, unit, currentValue, categoriesId, motivation, startDate, endDate, status, term },
    entityId: id,
    mirror: (db) => upsertRow(db, 'goals', local),
  });
  return { success: local, queued: true };
}

export async function editGoalOffline(
  goalId: string,
  title: string,
  iconId: string,
  description: string,
  targetValue: number,
  unit: string,
  currentValue: number,
  complete: boolean,
  categoriesId: string[],
  motivation: string,
  startDate: string,
  endDate: string,
  status: string,
  term: string,
  t: TFunction
): Promise<MutationResult> {
  if (!isOffline()) {
    return editGoal(goalId, title, iconId, description, targetValue, unit, currentValue, complete, categoriesId, motivation, startDate, endDate, status, term, t) as Promise<MutationResult>;
  }
  const store = getOfflineStore();
  const current = store.getState().goals.goals.find((g) => g.id === goalId);
  if (!current) return { error: t('UnexpectedError') };
  const updated = { ...current, name: title, iconId, description, targetValue, unit, currentValue, complete, motivation, startDate, endDate, status, term } as unknown as goal;
  store.dispatch(enterGoals(store.getState().goals.goals.map((g) => (g.id === goalId ? updated : g))));
  await queueMutation({
    opType: 'goal.edit',
    payload: { goalId, title, iconId, description, targetValue, unit, currentValue, complete, categoriesId, motivation, startDate, endDate, status, term },
    entityId: goalId,
    mirror: (db) => upsertRow(db, 'goals', updated),
  });
  return { success: updated, queued: true };
}

export async function deleteGoalOffline(goalId: string, t: TFunction): Promise<MutationResult> {
  if (!isOffline()) {
    return deleteGoal(goalId, t) as Promise<MutationResult>;
  }
  const store = getOfflineStore();
  store.dispatch(enterGoals(store.getState().goals.goals.filter((g) => g.id !== goalId)));
  await queueMutation({
    opType: 'goal.delete',
    payload: { id: goalId },
    entityId: goalId,
    mirror: (db) => deleteRow(db, 'goals', goalId),
  });
  return { success: true, queued: true };
}

/**
 * Signature quirk preserved from the online api: returns Promise<goal> and
 * THROWS on error (no {error} wrapper) — never a MutationResult shape.
 */
export async function increaseGoalOffline(id: string, t: TFunction): Promise<goal> {
  if (!isOffline()) {
    return increaseCurrentValue(id, t);
  }
  const store = getOfflineStore();
  const current = store.getState().goals.goals.find((g) => g.id === id);
  if (!current) throw new Error(t('UnexpectedError'));
  const updated = { ...current, currentValue: current.currentValue + 1 } as goal;
  store.dispatch(updateGoal(updated));
  await queueMutation({
    opType: 'goal.increase',
    payload: { id },
    entityId: id,
    mirror: (db) => upsertRow(db, 'goals', updated),
  });
  return updated;
}

/** Same quirk as increase: Promise<goal>, throws on error; floors at 0 like the backend. */
export async function decreaseGoalOffline(id: string, t: TFunction): Promise<goal> {
  if (!isOffline()) {
    return decreaseCurrentValue(id, t);
  }
  const store = getOfflineStore();
  const current = store.getState().goals.goals.find((g) => g.id === id);
  if (!current) throw new Error(t('UnexpectedError'));
  const updated = { ...current, currentValue: Math.max(0, current.currentValue - 1) } as goal;
  store.dispatch(updateGoal(updated));
  await queueMutation({
    opType: 'goal.decrease',
    payload: { id },
    entityId: id,
    mirror: (db) => upsertRow(db, 'goals', updated),
  });
  return updated;
}

/**
 * Offline: marks the goal complete locally and queues goal.complete — there is
 * no RefreshUI (XP) yet, that only arrives once the op replays. NEVER compute
 * XP locally. Callers must check `queued` and skip applyRefreshUi when true.
 */
export async function completeGoalOffline(id: string, t: TFunction): Promise<CompleteResult> {
  if (!isOffline()) {
    return markGoalAsComplete(id, t);
  }
  const store = getOfflineStore();
  const current = store.getState().goals.goals.find((g) => g.id === id);
  if (!current) return { error: t('UnexpectedError') };
  const updated = { ...current, complete: true, status: 'COMPLETED' } as goal;
  store.dispatch(updateGoal(updated));
  await queueMutation({
    opType: 'goal.complete',
    payload: { id },
    entityId: id,
    mirror: (db) => upsertRow(db, 'goals', updated),
  });
  return { queued: true };
}
