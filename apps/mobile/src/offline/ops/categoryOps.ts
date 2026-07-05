import type { TFunction } from 'i18next';
import createCategory from '@beyou/api/categories/createCategory';
import editCategory from '@beyou/api/categories/editCategory';
import deleteCategory from '@beyou/api/categories/deleteCategory';
import { enterCategories } from '@beyou/state/category/categoriesSlice';
import { upsertRow, deleteRow } from '@beyou/offline';
import type category from '@beyou/types/category/categoryType';
import { uuidv4 } from '../../lib/uuid';
import { getOfflineStore, isOffline, queueMutation } from '../mutations';

type MutationResult = { success?: unknown; error?: unknown; validation?: string; queued?: boolean };

export async function createCategoryOffline(
  name: string,
  description: string,
  experience: number,
  icon: string,
  t: TFunction
): Promise<MutationResult> {
  if (!isOffline()) {
    return createCategory(name, description, experience, icon, t, undefined) as Promise<MutationResult>;
  }
  const store = getOfflineStore();
  const id = uuidv4();
  // Gamification fields are LOCAL PLACEHOLDERS (never trusted): the post-sync
  // pull replaces this row with the server's truth.
  const local = {
    id,
    name,
    description,
    iconId: icon,
    xp: 0,
    nextLevelXp: 0,
    actualLevelXp: 0,
    level: 1,
    createdAt: new Date().toISOString(),
  } as unknown as category;
  store.dispatch(enterCategories([...store.getState().categories.categories, local]));
  await queueMutation({
    opType: 'category.create',
    payload: { id, name, description, experience, icon },
    entityId: id,
    mirror: (db) => upsertRow(db, 'categories', local),
  });
  return { success: local, queued: true };
}

export async function editCategoryOffline(
  categoryId: string,
  name: string,
  description: string,
  icon: string,
  t: TFunction
): Promise<MutationResult> {
  if (!isOffline()) {
    return editCategory(categoryId, name, description, icon, t) as Promise<MutationResult>;
  }
  const store = getOfflineStore();
  const current = store.getState().categories.categories.find((c) => c.id === categoryId);
  if (!current) return { error: t('UnexpectedError') };
  const updated = { ...current, name, description, iconId: icon } as category;
  store.dispatch(
    enterCategories(store.getState().categories.categories.map((c) => (c.id === categoryId ? updated : c)))
  );
  await queueMutation({
    opType: 'category.edit',
    payload: { categoryId, name, description, icon },
    entityId: categoryId,
    mirror: (db) => upsertRow(db, 'categories', updated),
  });
  return { success: updated, queued: true };
}

export async function deleteCategoryOffline(categoryId: string, t: TFunction): Promise<MutationResult> {
  if (!isOffline()) {
    return deleteCategory(categoryId, t) as Promise<MutationResult>;
  }
  const store = getOfflineStore();
  store.dispatch(
    enterCategories(store.getState().categories.categories.filter((c) => c.id !== categoryId))
  );
  await queueMutation({
    opType: 'category.delete',
    payload: { id: categoryId },
    entityId: categoryId,
    mirror: (db) => deleteRow(db, 'categories', categoryId),
  });
  return { success: true, queued: true };
}
