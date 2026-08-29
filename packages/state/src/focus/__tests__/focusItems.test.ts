import { describe, expect, it } from 'vitest';
import type { Routine } from '@beyou/types/routine/routine';
import { getFocusItems, isFocusItemOpen } from '../focusItems';

const daily = (sections: unknown[]): Routine =>
  ({ id: 'r', name: 'R', iconId: '', routineSections: sections } as unknown as Routine);

const section = (name: string, groups: Record<string, unknown>) =>
  ({ id: `s-${name}`, name, iconId: '', order: 0, taskGroup: [], habitGroup: [], ...groups });

describe('getFocusItems on a DAILY routine', () => {
  it('keeps sections in card order and sorts by time inside each one', () => {
    // Card order on purpose: sections render in array order, so a global sort by time would
    // make the focus screen's "next" disagree with the list the person just looked at.
    const routine = daily([
      section('Evening', {
        habitGroup: [
          { id: 'hg-late', habitId: 'h2', startTime: '21:00', endTime: '21:30' },
          { id: 'hg-early-evening', habitId: 'h3', startTime: '19:00', endTime: '19:30' },
        ],
      }),
      section('Morning', {
        habitGroup: [{ id: 'hg-dawn', habitId: 'h1', startTime: '06:00', endTime: '06:30' }],
      }),
    ]);

    expect(getFocusItems(routine).map((i) => i.groupId)).toEqual([
      'hg-early-evening',
      'hg-late',
      'hg-dawn',
    ]);
  });

  it('carries habits and tasks alike, with the section they came from', () => {
    const routine = daily([
      section('Morning', {
        habitGroup: [{ id: 'hg1', habitId: 'h1', startTime: '07:00', endTime: '07:30' }],
        taskGroup: [{ id: 'tg1', taskId: 't1', startTime: '08:00', endTime: '08:30' }],
      }),
    ]);

    expect(getFocusItems(routine)).toEqual([
      expect.objectContaining({ groupId: 'hg1', type: 'habit', itemId: 'h1', sectionName: 'Morning' }),
      expect.objectContaining({ groupId: 'tg1', type: 'task', itemId: 't1', sectionName: 'Morning' }),
    ]);
  });

  it('sinks untimed items to the end of their own section, not to the front', () => {
    const routine = daily([
      section('Morning', {
        habitGroup: [
          { id: 'hg-none', habitId: 'h0' },
          { id: 'hg-timed', habitId: 'h1', startTime: '07:00', endTime: '07:30' },
        ],
      }),
      section('Evening', {
        habitGroup: [{ id: 'hg-evening', habitId: 'h2', startTime: '20:00', endTime: '20:30' }],
      }),
    ]);

    expect(getFocusItems(routine).map((i) => i.groupId)).toEqual([
      'hg-timed',
      'hg-none',
      'hg-evening',
    ]);
  });

  it('drops a group with no id, which could never be checked anyway', () => {
    // The check endpoint takes the group id. A row without one is a row the screen would
    // offer and then fail to submit.
    const routine = daily([
      section('Morning', {
        habitGroup: [
          { habitId: 'h-orphan', startTime: '07:00' },
          { id: 'hg1', habitId: 'h1', startTime: '08:00' },
        ],
      }),
    ]);

    expect(getFocusItems(routine).map((i) => i.groupId)).toEqual(['hg1']);
  });

  it('treats an empty time string as no time at all', () => {
    const routine = daily([
      section('Morning', { habitGroup: [{ id: 'hg1', habitId: 'h1', startTime: '', endTime: '' }] }),
    ]);

    const [item] = getFocusItems(routine);
    expect(item.startTime).toBeUndefined();
    expect(item.endTime).toBeUndefined();
  });
});

describe('getFocusItems on a LIST routine', () => {
  const list = {
    id: 'r',
    name: 'R',
    iconId: '',
    type: 'LIST',
    routineSections: [],
    items: [
      { id: 'g2', type: 'TASK', taskId: 't1', orderIndex: 1 },
      { id: 'g1', type: 'HABIT', habitId: 'h1', orderIndex: 0 },
    ],
  } as unknown as Routine;

  it('follows the order the user dragged, with no times on anything', () => {
    const items = getFocusItems(list);

    expect(items.map((i) => i.groupId)).toEqual(['g1', 'g2']);
    expect(items.every((i) => i.startTime === undefined)).toBe(true);
    expect(items.map((i) => i.type)).toEqual(['habit', 'task']);
  });
});

describe('getFocusItems edge cases', () => {
  it('gives an empty list for no routine and for a routine with no sections', () => {
    expect(getFocusItems(null)).toEqual([]);
    expect(getFocusItems(undefined)).toEqual([]);
    expect(getFocusItems(daily([]))).toEqual([]);
  });
});

describe('isFocusItemOpen', () => {
  const withChecks = (checks: unknown[]) =>
    ({ groupId: 'g', type: 'habit', itemId: 'h', sectionName: '', checks } as never);

  it('is closed by a check and closed by a skip, on that date only', () => {
    expect(isFocusItemOpen(withChecks([{ checkDate: '2026-08-28', checked: true }]), '2026-08-28')).toBe(false);
    expect(isFocusItemOpen(withChecks([{ checkDate: '2026-08-28', skipped: true }]), '2026-08-28')).toBe(false);
    // Yesterday's check says nothing about today.
    expect(isFocusItemOpen(withChecks([{ checkDate: '2026-08-27', checked: true }]), '2026-08-28')).toBe(true);
    expect(isFocusItemOpen(withChecks([]), '2026-08-28')).toBe(true);
  });
});
