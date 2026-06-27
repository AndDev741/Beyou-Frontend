import { describe, it, expect } from 'vitest';
import reducer, { setViewSort, hydrateViewFilters } from './viewFiltersSlice';

const initial = { categories: 'default', goals: 'default', habits: 'default', routines: 'default', tasks: 'default' };

describe('viewFiltersSlice', () => {
  it('setViewSort updates one view', () => {
    const next = reducer(initial, setViewSort({ view: 'habits', sortBy: 'name-asc' }));
    expect(next.habits).toBe('name-asc');
    expect(next.tasks).toBe('default');
  });

  it('hydrateViewFilters merges only known string keys', () => {
    const next = reducer(initial, hydrateViewFilters({ habits: 'xp-desc', goals: 'name-asc' }));
    expect(next.habits).toBe('xp-desc');
    expect(next.goals).toBe('name-asc');
    expect(next.categories).toBe('default');
  });

  it('hydrateViewFilters ignores null, non-objects, and bad values', () => {
    expect(reducer(initial, hydrateViewFilters(null))).toEqual(initial);
    // unknown keys and non-string values are dropped
    const next = reducer(initial, hydrateViewFilters({ habits: 42 as never, bogus: 'x' } as never));
    expect(next).toEqual(initial);
  });
});
