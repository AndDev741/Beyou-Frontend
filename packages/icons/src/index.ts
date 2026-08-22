export type { IconKind, IconEntry, IconDescriptor, LucideIconNode } from './types';
export { resolveIcon } from './resolve';
export { getExtraIconNode, getExtraIconNames } from './extraNodes';
export { getAllEntries, getEntryById, getCanonicalId, getAvailableCategories } from './registry';
export {
  searchIcons,
  normalizeIconId,
  getIconCategories,
  getIconCategoryLabel,
  getIconLocaleMap,
} from './search';
export { createIconRecents } from './recents';
export type { IconRecentsStorage } from './recents';
