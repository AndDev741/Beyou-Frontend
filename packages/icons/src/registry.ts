import lucideNames from './data/lucideNames.json';
import emojiCharMap from './data/emojiCharMap.json';
import type { IconEntry } from './types';

const humanize = (kebab: string) => kebab.replace(/-/g, ' ').trim();
const toKeywords = (value: string) =>
  Array.from(new Set(value.toLowerCase().split(/\s+/).filter(Boolean)));

function buildLucideEntries(): IconEntry[] {
  return (lucideNames as string[]).map((name) => {
    const label = humanize(name);
    return {
      id: `lucide:${name}`,
      type: 'lucide' as const,
      label,
      keywords: toKeywords(label),
      categories: ['icons'],
      legacyIds: [name],
      lucideName: name,
    };
  });
}

function buildEmojiEntries(): IconEntry[] {
  return Object.entries(emojiCharMap as Record<string, string>).map(([short, char]) => {
    const label = short.replace(/_/g, ' ');
    return {
      id: `emoji:${short}`,
      type: 'emoji' as const,
      label,
      keywords: Array.from(new Set([...toKeywords(label), short])),
      categories: ['emoji'],
      legacyIds: [char],
      emoji: char,
    };
  });
}

export const allEntries: IconEntry[] = [...buildLucideEntries(), ...buildEmojiEntries()];

const byId = new Map<string, IconEntry>();
for (const entry of allEntries) {
  byId.set(entry.id, entry);
  for (const legacy of entry.legacyIds) if (!byId.has(legacy)) byId.set(legacy, entry);
}

export const getEntryById = (id: string): IconEntry | undefined => (id ? byId.get(id) : undefined);
export const getCanonicalId = (id: string): string => getEntryById(id)?.id ?? id;
export const getAvailableCategories = (): string[] => ['icons', 'emoji'];
