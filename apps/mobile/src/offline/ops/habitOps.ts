import type { TFunction } from 'i18next';
import createHabit from '@beyou/api/habits/createHabit';
import editHabit from '@beyou/api/habits/editHabit';
import deleteHabit from '@beyou/api/habits/deleteHabit';
import { enterHabits } from '@beyou/state/habit/habitsSlice';
import { upsertRow, deleteRow } from '@beyou/offline';
import type { habit } from '@beyou/types/habit/habitType';
import { uuidv4 } from '../../lib/uuid';
import { getOfflineStore, isOffline, queueMutation } from '../mutations';

type MutationResult = { success?: unknown; error?: unknown; validation?: string; queued?: boolean };

export async function createHabitOffline(
  name: string,
  description: string,
  motivationalPhrase: string,
  importance: number,
  dificulty: number,
  iconId: string,
  experience: number,
  categoriesId: string[],
  t: TFunction
): Promise<MutationResult> {
  if (!isOffline()) {
    return createHabit(name, description, motivationalPhrase, importance, dificulty, iconId, experience, categoriesId, t, undefined) as Promise<MutationResult>;
  }
  const store = getOfflineStore();
  const id = uuidv4();
  const categories = store
    .getState()
    .categories.categories.filter((c) => categoriesId.includes(c.id));
  // Gamification fields are LOCAL PLACEHOLDERS (never trusted): the post-sync
  // pull replaces this row with the server's truth.
  const local = {
    id,
    name,
    description,
    motivationalPhrase,
    iconId,
    categories,
    routines: {},
    importance,
    dificulty,
    xp: 0,
    level: 1,
    nextLevelXp: 0,
    actualLevelXp: 0,
    constance: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as habit;
  store.dispatch(enterHabits([...store.getState().habits.habits, local]));
  await queueMutation({
    opType: 'habit.create',
    payload: { id, name, description, motivationalPhrase, importance, dificulty, iconId, experience, categoriesId },
    entityId: id,
    mirror: (db) => upsertRow(db, 'habits', local),
  });
  return { success: local, queued: true };
}

export async function editHabitOffline(
  habitId: string,
  name: string,
  description: string,
  motivationalPhrase: string,
  iconId: string,
  importance: number,
  dificulty: number,
  categoriesId: string[],
  t: TFunction
): Promise<MutationResult> {
  if (!isOffline()) {
    return editHabit(habitId, name, description, motivationalPhrase, iconId, importance, dificulty, categoriesId, t) as Promise<MutationResult>;
  }
  const store = getOfflineStore();
  const current = store.getState().habits.habits.find((h) => h.id === habitId);
  if (!current) return { error: t('UnexpectedError') };
  const categories = store
    .getState()
    .categories.categories.filter((c) => categoriesId.includes(c.id));
  const updated = { ...current, name, description, motivationalPhrase, iconId, importance, dificulty, categories } as habit;
  store.dispatch(enterHabits(store.getState().habits.habits.map((h) => (h.id === habitId ? updated : h))));
  await queueMutation({
    opType: 'habit.edit',
    payload: { habitId, name, description, motivationalPhrase, iconId, importance, dificulty, categoriesId },
    entityId: habitId,
    mirror: (db) => upsertRow(db, 'habits', updated),
  });
  return { success: updated, queued: true };
}

export async function deleteHabitOffline(habitId: string, t: TFunction): Promise<MutationResult> {
  if (!isOffline()) {
    return deleteHabit(habitId, t) as Promise<MutationResult>;
  }
  const store = getOfflineStore();
  store.dispatch(enterHabits(store.getState().habits.habits.filter((h) => h.id !== habitId)));
  await queueMutation({
    opType: 'habit.delete',
    payload: { id: habitId },
    entityId: habitId,
    mirror: (db) => deleteRow(db, 'habits', habitId),
  });
  return { success: true, queued: true };
}
