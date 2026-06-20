export type { IconKind, IconEntry, IconDescriptor } from './types';
export { resolveIcon } from './resolve';
export { allEntries, getEntryById, getCanonicalId, getAvailableCategories } from './registry';
export {
  searchIcons,
  normalizeIconId,
  getIconCategories,
  getIconCategoryLabel,
  getIconLocaleMap,
} from './search';
export { createIconRecents } from './recents';
export type { IconRecentsStorage } from './recents';
