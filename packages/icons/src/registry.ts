import lucideNames from './data/lucideNames.json';
import emojiCharMap from './data/emojiCharMap.json';
import emojiMeta from './data/emojiMeta.json';
import curated from './data/curated.json';
import type { IconEntry } from './types';

/**
 * Domain categories the picker browses by. These describe what an icon is FOR
 * (a habit about faith, food, money…), which is what someone reaching for an
 * icon is actually thinking about. `icons` / `emoji` are not in here — those are
 * type filters, carried by `IconEntry.type`.
 *
 * Keeping them apart matters: categories used to be exactly ['icons'] or
 * ['emoji'], so every entry shared them, and any query that was a substring of a
 * category keyword matched the entire catalog.
 */
export const ICON_CATEGORIES = [
  'health',
  'fitness',
  'food',
  'faith',
  'study',
  'work',
  'money',
  'home',
  'family',
  'nature',
  'leisure',
  'tech',
  'time',
  'travel',
] as const;

type CuratedEntry = { c: string[]; en: string[]; pt: string[] };
const curatedMap = curated as Record<string, CuratedEntry>;
const metaMap = emojiMeta as Record<string, { a?: string[]; c?: string }>;

/** emoji-datasource's own groupings, for the four that map cleanly onto ours. */
const EMOJI_CATEGORY_MAP: Record<string, string> = {
  'Animals & Nature': 'nature',
  'Food & Drink': 'food',
  'Travel & Places': 'travel',
  Activities: 'leisure',
};

/** Shared empty array, so uncategorized entries do not each allocate one. */
const EMPTY: string[] = [];

const humanize = (kebab: string) => kebab.replace(/-/g, ' ').trim();
const toKeywords = (value: string) =>
  Array.from(new Set(value.toLowerCase().split(/\s+/).filter(Boolean)));

function buildLucideEntries(): IconEntry[] {
  return (lucideNames as string[]).map((name) => {
    const id = `lucide:${name}`;
    const label = humanize(name);
    return {
      id,
      type: 'lucide' as const,
      label,
      keywords: toKeywords(label),
      categories: curatedMap[id]?.c ?? EMPTY,
      legacyIds: [name],
      lucideName: name,
    };
  });
}

/**
 * Most emoji have neither curated vocabulary nor a mapped category, so the common
 * path allocates nothing beyond the entry itself. Building a Set per entry for 1900
 * emoji was most of the registry's construction cost.
 */
const emojiCategories = (id: string, datasetCategory?: string): string[] => {
  const curatedCategories = curatedMap[id]?.c;
  const mapped = datasetCategory ? EMOJI_CATEGORY_MAP[datasetCategory] : undefined;
  if (!curatedCategories) return mapped ? [mapped] : EMPTY;
  if (!mapped || curatedCategories.includes(mapped)) return curatedCategories;
  return [...curatedCategories, mapped];
};

function buildEmojiEntries(): IconEntry[] {
  return Object.entries(emojiCharMap as Record<string, string>).map(([short, char]) => {
    const id = `emoji:${short}`;
    const label = short.replace(/_/g, ' ');
    const meta = metaMap[short];
    return {
      id,
      type: 'emoji' as const,
      label,
      keywords: toKeywords(label),
      // Real alternative names, so "thumbsup" finds the emoji whose primary
      // short_name is "+1". Kept apart from `keywords` (which are just the words
      // of the label) because a full name is a stronger match than one word of one.
      altNames: meta?.a ? [short, ...meta.a] : [short],
      categories: emojiCategories(id, meta?.c),
      legacyIds: [char],
      emoji: char,
    };
  });
}

/**
 * Built on first use, not at import. `resolveIcon` — which is what every habit card,
 * dashboard row and list tile actually calls — needs none of this, and it reaches the
 * package through the same barrel. Eagerly building 3600 entries meant rendering a
 * single icon paid for the whole picker catalogue.
 */
let entries: IconEntry[] | null = null;
let entriesById: Map<string, IconEntry> | null = null;

const build = () => {
  const built = [...buildLucideEntries(), ...buildEmojiEntries()];
  const index = new Map<string, IconEntry>();
  for (const entry of built) {
    index.set(entry.id, entry);
    for (const legacy of entry.legacyIds) if (!index.has(legacy)) index.set(legacy, entry);
  }
  entries = built;
  entriesById = index;
};

export const getAllEntries = (): IconEntry[] => {
  if (!entries) build();
  return entries as IconEntry[];
};

const getIndex = (): Map<string, IconEntry> => {
  if (!entriesById) build();
  return entriesById as Map<string, IconEntry>;
};

export const getEntryById = (id: string): IconEntry | undefined =>
  id ? getIndex().get(id) : undefined;
export const getCanonicalId = (id: string): string => getEntryById(id)?.id ?? id;
export const getAvailableCategories = (): string[] => [...ICON_CATEGORIES];

/** Translated search terms for an entry, if it has been curated. */
export const getCuratedTerms = (id: string, locale: 'en' | 'pt'): string[] => {
  const entry = curatedMap[id];
  if (!entry) return [];
  // English always rides along: people type English words in a Portuguese UI
  // (and the reverse), and there is no cost to matching both.
  return locale === 'en' ? entry.en : [...entry.pt, ...entry.en];
};
