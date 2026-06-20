export interface IconRecentsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

const KEY = 'beyou.iconRecents';
const MAX = 12;

/**
 * Storage-injected recents so the same logic works on web (localStorage) and
 * native (AsyncStorage / no-op). Pass no storage to disable persistence.
 */
export function createIconRecents(storage?: IconRecentsStorage) {
  const getRecentIconIds = (): string[] => {
    if (!storage) return [];
    try {
      const parsed = JSON.parse(storage.getItem(KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  };

  const pushRecentIconId = (id: string): void => {
    if (!storage || !id) return;
    const next = [id, ...getRecentIconIds().filter((x) => x !== id)].slice(0, MAX);
    storage.setItem(KEY, JSON.stringify(next));
  };

  const clearRecentIcons = (): void => {
    if (!storage) return;
    if (storage.removeItem) storage.removeItem(KEY);
    else storage.setItem(KEY, '[]');
  };

  return { getRecentIconIds, pushRecentIconId, clearRecentIcons };
}
