import { describe, it, expect } from 'vitest';
import { sortGoalsByTime } from './sortGoalsByTime';
import type { goal } from '@beyou/types/goals/goalType';

const g = (id: string, endDate: Date | string): goal =>
  ({ id, name: id, iconId: '', targetValue: 10, unit: '', currentValue: 0, complete: false,
     categories: {}, startDate: new Date(0), endDate, xpReward: 0, status: 'NOT_STARTED', term: 'SHORT_TERM' }) as goal;

const daysFromNow = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

describe('sortGoalsByTime', () => {
  it('buckets clearly-dated goals (today→thisWeek, far past→past, far future→beyond)', () => {
    const today = g('today', new Date());
    const past = g('past', daysFromNow(-60));
    const future = g('future', (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 3); return d; })());
    const out = sortGoalsByTime([today, past, future]);
    expect(out.thisWeek.map((x) => x.id)).toContain('today');
    expect(out.past.map((x) => x.id)).toContain('past');
    expect(out.beyond.map((x) => x.id)).toContain('future');
  });

  it('places each goal in exactly one bucket', () => {
    const goals = [g('a', new Date()), g('b', daysFromNow(-60)), g('c', daysFromNow(400))];
    const out = sortGoalsByTime(goals);
    const total = out.past.length + out.thisWeek.length + out.thisMonth.length + out.thisYear.length + out.beyond.length;
    expect(total).toBe(3);
  });

  it('accepts ISO-string end dates and skips invalid ones', () => {
    const out = sortGoalsByTime([g('iso', new Date().toISOString()), g('bad', 'not-a-date')]);
    expect(out.thisWeek.map((x) => x.id)).toContain('iso');
    const total = out.past.length + out.thisWeek.length + out.thisMonth.length + out.thisYear.length + out.beyond.length;
    expect(total).toBe(1); // invalid dropped
  });

  it('returns empty buckets for empty input', () => {
    const out = sortGoalsByTime([]);
    expect(out).toEqual({ past: [], thisWeek: [], thisMonth: [], thisYear: [], beyond: [] });
  });
});
