import { createIconRecents, type IconRecentsStorage } from '@beyou/icons';

// ponytail: in-memory, session-scoped recents. The shared createIconRecents storage
// interface is SYNC; AsyncStorage is async and can't back it. Swap for a sync MMKV
// wrapper if recents should survive an app restart.
const memory = new Map<string, string>();
const memoryStorage: IconRecentsStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => {
    memory.set(key, value);
  },
  removeItem: (key) => {
    memory.delete(key);
  },
};

export const iconRecents = createIconRecents(memoryStorage);
