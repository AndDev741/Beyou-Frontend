import { getAllEntries, getAvailableCategories, getCanonicalId, getCuratedTerms } from './registry';
import type { IconEntry } from './types';
import enMap from './i18n/en.json';
import ptMap from './i18n/pt.json';

type IconLocaleMap = {
  categoryLabels: Record<string, string>;
  categoryKeywords: Record<string, string[]>;
  queryAliases?: Record<string, string[]>;
};

const localeMaps: Record<string, IconLocaleMap> = {
  en: enMap as IconLocaleMap,
  pt: ptMap as IconLocaleMap,
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const getLocaleKey = (locale?: string) => (locale ? locale.split('-')[0] || 'en' : 'en');
const getCuratedLocale = (locale?: string): 'en' | 'pt' =>
  getLocaleKey(locale) === 'pt' ? 'pt' : 'en';

export const getIconLocaleMap = (locale?: string): IconLocaleMap =>
  localeMaps[getLocaleKey(locale)] || (enMap as IconLocaleMap);

export const getIconCategoryLabel = (category: string, locale?: string): string =>
  getIconLocaleMap(locale).categoryLabels[category] || category;

export const getIconCategories = (): string[] => getAvailableCategories();

/**
 * Alias keys are looked up with a normalized query, so they have to be normalized
 * themselves. They were not, which silently killed every accented key in the
 * Portuguese map — "coração" could never match, only its "coracao" twin did.
 */
const buildAliasIndex = (map: IconLocaleMap): Record<string, string[]> => {
  const out: Record<string, string[]> = {};
  for (const [key, values] of Object.entries(map.queryAliases || {})) {
    const k = normalize(key);
    if (!k) continue;
    out[k] = Array.from(new Set([...(out[k] || []), ...values.map(normalize).filter(Boolean)]));
  }
  return out;
};

const aliasIndexCache = new Map<string, Record<string, string[]>>();
const getAliasIndex = (locale?: string) => {
  const key = getLocaleKey(locale);
  let idx = aliasIndexCache.get(key);
  if (!idx) {
    idx = buildAliasIndex(getIconLocaleMap(locale));
    aliasIndexCache.set(key, idx);
  }
  return idx;
};

/**
 * What an entry can be found by, in three tiers of decreasing directness:
 *
 *   name     — what this icon IS: its label, its curated vocabulary, its alternative
 *              names, the emoji character itself.
 *   token    — single words pulled out of a multi-word label. "house" is one word of
 *              "derelict house building", which should not rank with the icon whose
 *              whole name is "house".
 *   category — what its whole group is about. "igreja" is a keyword of the entire
 *              faith category; without a lower tier every faith icon tied with the
 *              church itself and the list came back alphabetical.
 *
 * Terms stay separate instead of joined into one blob because matching is anchored to
 * term and word starts, so a query can no longer land in the middle of an unrelated
 * word — "bolo" (cake) used to return the whole catalog by sitting inside "simbolo".
 */
type EntryTerms = { name: string[]; token: string[]; category: string[] };

const dedupeNormalized = (values: string[]) =>
  Array.from(new Set(values.map(normalize).filter(Boolean)));

const buildEntryTerms = (entry: IconEntry, locale?: string): EntryTerms => {
  const map = getIconLocaleMap(locale);
  return {
    // Curated terms come first so their authored order survives into the tiebreak
    // below: the vocabulary is written most-relevant-first per icon.
    name: dedupeNormalized([
      ...getCuratedTerms(entry.id, getCuratedLocale(locale)),
      entry.label,
      ...entry.legacyIds,
      ...(entry.altNames ?? []),
      ...(entry.emoji ? [entry.emoji] : []),
    ]),
    token: dedupeNormalized(entry.keywords),
    category: dedupeNormalized(
      entry.categories.flatMap((c) => [
        map.categoryLabels[c] || c,
        ...(map.categoryKeywords[c] || []),
      ]),
    ),
  };
};

const termsCache = new Map<string, Map<string, EntryTerms>>();
const getCachedTerms = (entry: IconEntry, locale?: string): EntryTerms => {
  const key = getLocaleKey(locale);
  let bucket = termsCache.get(key);
  if (!bucket) {
    bucket = new Map();
    termsCache.set(key, bucket);
  }
  const cached = bucket.get(entry.id);
  if (cached) return cached;
  const terms = buildEntryTerms(entry, locale);
  bucket.set(entry.id, terms);
  return terms;
};

type Tier = { exact: number; termPrefix: number; wordPrefix: number };
const NAME: Tier = { exact: 9, termPrefix: 8, wordPrefix: 7 };
const TOKEN: Tier = { exact: 6, termPrefix: 5, wordPrefix: 4 };
const CATEGORY: Tier = { exact: 3, termPrefix: 2, wordPrefix: 1 };

const scoreTerm = (term: string, query: string, tier: Tier): number => {
  if (term === query) return tier.exact;
  if (term.startsWith(query)) return tier.termPrefix;
  // A word start inside a multi-word phrase: "agua" finds "beber agua".
  if (term.includes(` ${query}`)) return tier.wordPrefix;
  return 0;
};

/** Best score across one tier's terms, plus where it matched (for the tiebreak). */
const scoreTier = (terms: string[], query: string, tier: Tier) => {
  let score = 0;
  let at = terms.length;
  for (let i = 0; i < terms.length; i += 1) {
    const s = scoreTerm(terms[i], query, tier);
    if (s > score) {
      score = s;
      at = i;
    }
  }
  return { score, at };
};

type SearchOptions = { query: string; locale?: string; category?: string; limit?: number };

const filterByCategory = (entries: IconEntry[], category?: string): IconEntry[] => {
  if (!category || category === 'all') return entries;
  if (category === 'icons') return entries.filter((e) => e.type === 'lucide');
  if (category === 'emoji') return entries.filter((e) => e.type === 'emoji');
  return entries.filter((e) => e.categories.includes(category));
};

const sampleEntries = (entries: IconEntry[], limit: number) => {
  if (entries.length <= limit) return entries;
  const shuffled = [...entries].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, limit);
};

export const searchIcons = ({ query, locale, category, limit = 36 }: SearchOptions): IconEntry[] => {
  const filtered = filterByCategory(getAllEntries(), category);
  const normalizedQuery = normalize(query || '');
  if (!normalizedQuery) return sampleEntries(filtered, limit);

  const aliases = getAliasIndex(locale)[normalizedQuery] || [];
  const queries = Array.from(new Set([normalizedQuery, ...aliases]));

  const scored: { entry: IconEntry; score: number; at: number }[] = [];
  for (const entry of filtered) {
    const terms = getCachedTerms(entry, locale);
    let best = 0;
    let bestAt = Number.MAX_SAFE_INTEGER;
    for (const q of queries) {
      const tiers = [
        scoreTier(terms.name, q, NAME),
        scoreTier(terms.token, q, TOKEN),
        scoreTier(terms.category, q, CATEGORY),
      ];
      for (const { score, at } of tiers) {
        if (score === 0) continue;
        // The typed query beats anything reached through an alias, but only as a
        // tiebreak within a tier — never enough to promote a weaker match.
        const weighted = score * 2 + (q === normalizedQuery ? 1 : 0);
        if (weighted > best || (weighted === best && at < bestAt)) {
          best = weighted;
          bestAt = Math.min(at, bestAt);
        }
      }
    }
    if (best > 0) scored.push({ entry, score: best, at: bestAt });
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    // Equal scores: whichever matched earlier in its own authored vocabulary wins,
    // so "oração" puts 🙏 ahead of icons that merely list it further down.
    if (a.at !== b.at) return a.at - b.at;
    return a.entry.label.localeCompare(b.entry.label);
  });
  return scored.slice(0, limit).map((item) => item.entry);
};

export const normalizeIconId = (id: string): string => getCanonicalId(id);
