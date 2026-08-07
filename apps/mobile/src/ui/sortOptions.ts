/**
 * As mesmas opções de ordenação das listagens da web, guardadas como
 * `value` + chave de i18n. Ficam num módulo só porque o toolbar de cada tela
 * pede a lista já traduzida — e porque a ordem tem de bater com a web.
 */
export interface SortOptionKey {
  value: string;
  key: string;
}

export const HABIT_SORT_OPTIONS: SortOptionKey[] = [
  { value: 'default', key: 'Default order' },
  { value: 'name-asc', key: 'Name (A-Z)' },
  { value: 'name-desc', key: 'Name (Z-A)' },
  { value: 'level-desc', key: 'Level (High to Low)' },
  { value: 'level-asc', key: 'Level (Low to High)' },
  { value: 'xp-desc', key: 'XP (High to Low)' },
  { value: 'xp-asc', key: 'XP (Low to High)' },
  { value: 'importance-desc', key: 'Importance (High to Low)' },
  { value: 'importance-asc', key: 'Importance (Low to High)' },
  { value: 'difficulty-desc', key: 'Difficulty (High to Low)' },
  { value: 'difficulty-asc', key: 'Difficulty (Low to High)' },
  { value: 'created-desc', key: 'Newest first' },
  { value: 'created-asc', key: 'Oldest first' },
];

export const TASK_SORT_OPTIONS: SortOptionKey[] = [
  { value: 'default', key: 'Default order' },
  { value: 'name-asc', key: 'Name (A-Z)' },
  { value: 'name-desc', key: 'Name (Z-A)' },
  { value: 'importance-desc', key: 'Importance (High to Low)' },
  { value: 'importance-asc', key: 'Importance (Low to High)' },
  { value: 'difficulty-desc', key: 'Difficulty (High to Low)' },
  { value: 'difficulty-asc', key: 'Difficulty (Low to High)' },
  { value: 'created-desc', key: 'Newest first' },
  { value: 'created-asc', key: 'Oldest first' },
];

export const CATEGORY_SORT_OPTIONS: SortOptionKey[] = [
  { value: 'default', key: 'Default order' },
  { value: 'name-asc', key: 'Name (A-Z)' },
  { value: 'name-desc', key: 'Name (Z-A)' },
  { value: 'level-desc', key: 'Level (High to Low)' },
  { value: 'level-asc', key: 'Level (Low to High)' },
  { value: 'xp-desc', key: 'XP (High to Low)' },
  { value: 'xp-asc', key: 'XP (Low to High)' },
  { value: 'created-desc', key: 'Newest first' },
  { value: 'created-asc', key: 'Oldest first' },
];

export const GOAL_SORT_OPTIONS: SortOptionKey[] = [
  { value: 'default', key: 'Default order' },
  { value: 'name-asc', key: 'Name (A-Z)' },
  { value: 'name-desc', key: 'Name (Z-A)' },
  { value: 'xp-desc', key: 'XP Reward (High to Low)' },
  { value: 'xp-asc', key: 'XP Reward (Low to High)' },
  { value: 'progress-desc', key: 'Progress (High to Low)' },
  { value: 'progress-asc', key: 'Progress (Low to High)' },
  { value: 'end-asc', key: 'End date (Sooner first)' },
  { value: 'end-desc', key: 'End date (Later first)' },
  { value: 'start-desc', key: 'Newest first' },
  { value: 'start-asc', key: 'Oldest first' },
];
