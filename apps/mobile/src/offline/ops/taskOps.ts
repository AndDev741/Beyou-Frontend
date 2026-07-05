import type { TFunction } from 'i18next';
import createTask from '@beyou/api/tasks/createTask';
import editTask from '@beyou/api/tasks/editTask';
import deleteTask from '@beyou/api/tasks/deleteTask';
import { enterTasks } from '@beyou/state/task/tasksSlice';
import { upsertRow, deleteRow } from '@beyou/offline';
import type { task } from '@beyou/types/tasks/taskType';
import { uuidv4 } from '../../lib/uuid';
import { getOfflineStore, isOffline, queueMutation } from '../mutations';

type MutationResult = { success?: unknown; error?: unknown; validation?: string; queued?: boolean };

export async function createTaskOffline(
  name: string,
  description: string,
  iconId: string,
  categoriesId: string[],
  t: TFunction,
  importance?: number,
  difficulty?: number,
  oneTimeTask: boolean = false
): Promise<MutationResult> {
  if (!isOffline()) {
    return createTask(name, description, iconId, categoriesId, t, importance, difficulty, oneTimeTask, undefined) as Promise<MutationResult>;
  }
  const store = getOfflineStore();
  const id = uuidv4();
  // categories is a LOCAL PLACEHOLDER (never trusted): the post-sync pull
  // replaces this row with the server's truth (populated CategoryMiniDTO map).
  const local = {
    id,
    name,
    description,
    iconId,
    importance,
    difficulty,
    categories: {},
    oneTimeTask,
    markedToDelete: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as task;
  store.dispatch(enterTasks([...store.getState().tasks.tasks, local]));
  await queueMutation({
    opType: 'task.create',
    payload: { id, name, description, iconId, categoriesId, importance, difficulty, oneTimeTask },
    entityId: id,
    mirror: (db) => upsertRow(db, 'tasks', local),
  });
  return { success: local, queued: true };
}

export async function editTaskOffline(
  taskId: string,
  name: string,
  description: string,
  iconId: string,
  importance: number,
  difficulty: number,
  categoriesId: string[],
  oneTimeTask: boolean,
  t: TFunction
): Promise<MutationResult> {
  if (!isOffline()) {
    return editTask(taskId, name, description, iconId, importance, difficulty, categoriesId, oneTimeTask, t) as Promise<MutationResult>;
  }
  const store = getOfflineStore();
  const current = store.getState().tasks.tasks.find((tk) => tk.id === taskId);
  if (!current) return { error: t('UnexpectedError') };
  const updated = { ...current, name, description, iconId, importance, difficulty, oneTimeTask } as task;
  store.dispatch(enterTasks(store.getState().tasks.tasks.map((tk) => (tk.id === taskId ? updated : tk))));
  await queueMutation({
    opType: 'task.edit',
    payload: { taskId, name, description, iconId, importance, difficulty, categoriesId, oneTimeTask },
    entityId: taskId,
    mirror: (db) => upsertRow(db, 'tasks', updated),
  });
  return { success: updated, queued: true };
}

export async function deleteTaskOffline(taskId: string, t: TFunction): Promise<MutationResult> {
  if (!isOffline()) {
    return deleteTask(taskId, t) as Promise<MutationResult>;
  }
  const store = getOfflineStore();
  store.dispatch(enterTasks(store.getState().tasks.tasks.filter((tk) => tk.id !== taskId)));
  await queueMutation({
    opType: 'task.delete',
    payload: { id: taskId },
    entityId: taskId,
    mirror: (db) => deleteRow(db, 'tasks', taskId),
  });
  return { success: true, queued: true };
}
