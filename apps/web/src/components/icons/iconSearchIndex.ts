import { IconEntry, allEntries, getAvailableCategories, getCanonicalId } from "./iconRegistry";
import enMap from "./i18n/en.json";
import ptMap from "./i18n/pt.json";

type IconLocaleMap = {
    keywordsById: Record<string, string[]>;
    categoriesById: Record<string, string[]>;
    categoryLabels: Record<string, string>;
    categoryKeywords: Record<string, string[]>;
    queryAliases?: Record<string, string[]>;
};

const localeMaps: Record<string, IconLocaleMap> = {
    en: enMap,
    pt: ptMap
};

const normalize = (value: string) =>
    value
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();

const getLocaleKey = (locale?: string) => {
    if (!locale) return "en";
    return locale.split("-")[0] || "en";
};

export const getIconLocaleMap = (locale?: string): IconLocaleMap => {
    const key = getLocaleKey(locale);
    return localeMaps[key] || enMap;
};

export const getIconCategoryLabel = (category: string, locale?: string): string => {
    const map = getIconLocaleMap(locale);
    return map.categoryLabels[category] || category;
};

export const getIconCategories = (): string[] => {
    const categories = getAvailableCategories();
    return categories.sort((a, b) => a.localeCompare(b));
};

const getEntryCategories = (entry: IconEntry, map: IconLocaleMap): string[] => {
    return map.categoriesById[entry.id] || entry.categories;
};

const getEntryKeywords = (entry: IconEntry, map: IconLocaleMap): string[] => {
    const localized = map.keywordsById[entry.id] || [];
    const categories = getEntryCategories(entry, map);
    const categoryKeywords = categories.flatMap(
        (category) => map.categoryKeywords[category] || []
    );
    const categoryLabels = categories.map(
        (category) => map.categoryLabels[category] || category
    );
    return Array.from(
        new Set([
            entry.label,
            entry.id,
            ...entry.legacyIds,
            ...entry.keywords,
            ...localized,
            ...(entry.emoji ? [entry.emoji] : []),
            ...categoryKeywords,
            ...categoryLabels
        ])
    );
};

const searchCache = new Map<string, Map<string, string>>();

const getSearchText = (entry: IconEntry, locale?: string): string => {
    const key = getLocaleKey(locale);
    const map = getIconLocaleMap(locale);
    if (!searchCache.has(key)) {
        searchCache.set(key, new Map());
    }
    const bucket = searchCache.get(key)!;
    const cached = bucket.get(entry.id);
    if (cached) return cached;
    const keywords = getEntryKeywords(entry, map)
        .map(normalize)
        .filter(Boolean)
        .join(" ");
    bucket.set(entry.id, keywords);
    return keywords;
};

type SearchOptions = {
    query: string;
    locale?: string;
    category?: string;
    limit?: number;
};

const filterByCategory = (entries: IconEntry[], category?: string): IconEntry[] => {
    if (!category || category === "all") return entries;
    if (category === "icons") return entries.filter((entry) => entry.type === "icon");
    if (category === "emoji") return entries.filter((entry) => entry.type === "emoji");
    return entries.filter((entry) => entry.categories.includes(category));
};

const sampleEntries = (entries: IconEntry[], limit: number) => {
    if (entries.length <= limit) return entries;
    const shuffled = [...entries].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, limit);
};

export const searchIcons = ({ query, locale, category, limit = 36 }: SearchOptions) => {
    const filtered = filterByCategory(allEntries, category);
    const normalizedQuery = normalize(query || "");
    if (!normalizedQuery) {
        return sampleEntries(filtered, limit);
    }

    const map = getIconLocaleMap(locale);
    const aliasMap = map.queryAliases || {};
    const expandedQueries = Array.from(
        new Set([
            normalizedQuery,
            ...(aliasMap[normalizedQuery] || []).map(normalize)
        ])
    ).filter(Boolean);

    const scored = filtered
        .map((entry) => {
            const haystack = getSearchText(entry, locale);
            let bestIndex = -1;
            let bestScore = 0;
            expandedQueries.forEach((q) => {
                const index = haystack.indexOf(q);
                if (index === -1) return;
                const score = index === 0 ? 3 : 1;
                if (bestIndex === -1 || score > bestScore) {
                    bestIndex = index;
                    bestScore = score;
                }
            });
            if (bestIndex === -1) return null;
            return { entry, score: bestScore };
        })
        .filter(Boolean) as { entry: IconEntry; score: number }[];

    scored.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return a.entry.label.localeCompare(b.entry.label);
    });

    return scored.slice(0, limit).map((item) => item.entry);
};

export const normalizeIconId = (id: string): string => getCanonicalId(id);
