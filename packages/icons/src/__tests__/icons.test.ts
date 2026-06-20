import { describe, expect, it } from 'vitest';
import { resolveIcon } from '../resolve';
import { searchIcons, normalizeIconId } from '../search';
import { getEntryById, getCanonicalId } from '../registry';
import { createIconRecents } from '../recents';

describe('resolveIcon', () => {
  it('resolves lucide ids', () => {
    expect(resolveIcon('lucide:house')).toEqual({ kind: 'lucide', name: 'house' });
  });
  it('resolves emoji ids to the char', () => {
    expect(resolveIcon('emoji:fire')).toEqual({ kind: 'emoji', char: '🔥' });
  });
  it('resolves a raw emoji char (legacy)', () => {
    expect(resolveIcon('🔥')).toEqual({ kind: 'emoji', char: '🔥' });
  });
  it('falls back for legacy react-icons / empty / unknown', () => {
    expect(resolveIcon('ri:md/MdHome')).toEqual({ kind: 'fallback' });
    expect(resolveIcon('MdSportsGymnastics')).toEqual({ kind: 'fallback' });
    expect(resolveIcon('')).toEqual({ kind: 'fallback' });
    expect(resolveIcon('emoji:not_a_real_emoji')).toEqual({ kind: 'fallback' });
  });
});

describe('registry / canonical', () => {
  it('maps a legacy lucide name to its canonical id', () => {
    expect(getCanonicalId('house')).toBe('lucide:house');
    expect(getEntryById('lucide:house')?.lucideName).toBe('house');
  });
  it('maps a raw emoji char to its canonical emoji id', () => {
    expect(getCanonicalId('🔥')).toBe('emoji:fire');
  });
  it('returns the id unchanged when unknown', () => {
    expect(normalizeIconId('ri:md/MdHome')).toBe('ri:md/MdHome');
  });
});

describe('searchIcons', () => {
  it('finds a lucide icon by name', () => {
    const ids = searchIcons({ query: 'house', limit: 50 }).map((e) => e.id);
    expect(ids).toContain('lucide:house');
  });
  it('finds an emoji by short name', () => {
    const ids = searchIcons({ query: 'fire', limit: 50 }).map((e) => e.id);
    expect(ids).toContain('emoji:fire');
  });
  it('respects the limit and category filter', () => {
    const res = searchIcons({ query: '', category: 'emoji', limit: 5 });
    expect(res).toHaveLength(5);
    expect(res.every((e) => e.type === 'emoji')).toBe(true);
  });
});

describe('createIconRecents', () => {
  it('pushes most-recent-first, dedupes, and caps', () => {
    const store: Record<string, string> = {};
    const recents = createIconRecents({
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => {
        store[k] = v;
      },
    });
    recents.pushRecentIconId('lucide:house');
    recents.pushRecentIconId('emoji:fire');
    recents.pushRecentIconId('lucide:house');
    expect(recents.getRecentIconIds()).toEqual(['lucide:house', 'emoji:fire']);
  });
  it('is a no-op without storage', () => {
    const recents = createIconRecents();
    recents.pushRecentIconId('lucide:house');
    expect(recents.getRecentIconIds()).toEqual([]);
  });
});
