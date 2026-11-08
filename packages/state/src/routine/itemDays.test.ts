import { describe, expect, it } from 'vitest';
import type { Routine } from '@beyou/types/routine/routine';
import {
  followsRoutine,
  formatItemDays,
  isItemActiveOn,
  itemDaysMissSchedule,
  normalizeItemDays,
  todayWeekDay,
  toggleItemDay,
  weekDayOfIso,
} from './itemDays';
import { getListItems, getListStats, getRoutineStats, getSectionStats } from './routineMetrics';

// 2026-11-06 is a Friday, 2026-11-07 a Saturday.
const FRIDAY = '2026-11-06';
const SATURDAY = '2026-11-07';

describe('weekDayOfIso', () => {
  it('reads the weekday off the calendar day', () => {
    expect(weekDayOfIso(FRIDAY)).toBe('Friday');
    expect(weekDayOfIso(SATURDAY)).toBe('Saturday');
    expect(weekDayOfIso('2026-11-08')).toBe('Sunday');
  });
});

describe('todayWeekDay', () => {
  it('is the day in the user zone, not the UTC day', () => {
    // 22:30 on Friday in São Paulo is already 01:30 on Saturday in UTC. The UTC string
    // (`toJSON().slice(0, 10)`) says Saturday; the person is still in their Friday.
    const fridayNightInBrazil = new Date('2026-11-07T01:30:00Z');
    expect(fridayNightInBrazil.toJSON().slice(0, 10)).toBe(SATURDAY);
    expect(todayWeekDay('America/Sao_Paulo', fridayNightInBrazil)).toBe('Friday');
    expect(todayWeekDay('UTC', fridayNightInBrazil)).toBe('Saturday');
  });

  it('so a Saturday-only item stays off on a Brazilian Friday night', () => {
    const fridayNightInBrazil = new Date('2026-11-07T01:30:00Z');
    const weekday = todayWeekDay('America/Sao_Paulo', fridayNightInBrazil);
    expect(['Saturday'].includes(weekday)).toBe(false);
  });
});

describe('isItemActiveOn', () => {
  it('runs every day when the item has no days of its own', () => {
    expect(isItemActiveOn([], FRIDAY)).toBe(true);
    expect(isItemActiveOn(undefined, FRIDAY)).toBe(true);
    expect(isItemActiveOn(null, SATURDAY)).toBe(true);
  });

  it('runs only on its days when it has some', () => {
    expect(isItemActiveOn(['Saturday'], SATURDAY)).toBe(true);
    expect(isItemActiveOn(['Saturday'], FRIDAY)).toBe(false);
  });

  it('matches days written in another case', () => {
    expect(isItemActiveOn(['saturday'], SATURDAY)).toBe(true);
  });

  it('treats all seven days as no limit', () => {
    const all = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    expect(followsRoutine(all)).toBe(true);
    expect(isItemActiveOn(all, FRIDAY)).toBe(true);
  });
});

describe('toggleItemDay and normalizeItemDays', () => {
  it('adds and removes a day and keeps week order', () => {
    expect(toggleItemDay(['Sunday'], 'Saturday')).toEqual(['Saturday', 'Sunday']);
    expect(toggleItemDay(['Saturday', 'Sunday'], 'Saturday')).toEqual(['Sunday']);
    expect(toggleItemDay(undefined, 'Monday')).toEqual(['Monday']);
  });

  it('drops unknown values and repeats', () => {
    expect(normalizeItemDays(['Sunday', 'nope', 'sunday', 'Monday'])).toEqual(['Monday', 'Sunday']);
  });
});

describe('formatItemDays', () => {
  const t = (key: string) => `t:${key}`;

  it('uses the short-day keys in week order', () => {
    expect(formatItemDays(['Sunday', 'Saturday'], t)).toBe('t:Sat · t:Sun');
  });

  it('says nothing when the item follows the routine', () => {
    expect(formatItemDays([], t)).toBe('');
    expect(formatItemDays(undefined, t)).toBe('');
  });
});

describe('itemDaysMissSchedule', () => {
  it('flags days that never meet the schedule', () => {
    expect(itemDaysMissSchedule(['Monday'], ['Saturday', 'Sunday'])).toBe(true);
    expect(itemDaysMissSchedule(['Saturday'], ['Saturday', 'Sunday'])).toBe(false);
  });

  it('has nothing to say without a schedule or without item days', () => {
    expect(itemDaysMissSchedule(['Monday'], [])).toBe(false);
    expect(itemDaysMissSchedule(['Monday'], undefined)).toBe(false);
    expect(itemDaysMissSchedule([], ['Saturday'])).toBe(false);
  });
});

describe('stats with activeOn', () => {
  const routine = {
    name: 'Weekend',
    iconId: '',
    routineSections: [
      {
        id: 's1',
        name: 'Morning',
        iconId: '',
        startTime: '08:00',
        endTime: '10:00',
        order: 0,
        habitGroup: [
          { id: 'g1', habitId: 'h1', startTime: '08:00', habitGroupChecks: [{ id: 'c', checkDate: FRIDAY, checkTime: '', checked: true, xpGenerated: 5 }] },
          { id: 'g2', habitId: 'h2', startTime: '09:00', days: ['Saturday'] },
        ],
        taskGroup: [{ id: 'g3', taskId: 't1', startTime: '09:30', days: ['Friday', 'Saturday'] }],
      },
    ],
  } as Routine;

  it('leaves out the items whose days skip the date', () => {
    expect(getSectionStats(routine.routineSections[0], FRIDAY, FRIDAY)).toEqual({ totalItems: 2, completedItems: 1, xpEarned: 5 });
    expect(getRoutineStats(routine, SATURDAY, SATURDAY).totalItems).toBe(3);
  });

  it('counts everything when no activeOn is given, as the dashboard does', () => {
    expect(getRoutineStats(routine, FRIDAY).totalItems).toBe(3);
  });

  it('filters list items the same way', () => {
    const list = {
      name: 'L',
      iconId: '',
      type: 'LIST',
      routineSections: [],
      items: [
        { id: 'a', type: 'HABIT', habitId: 'h1', orderIndex: 0 },
        { id: 'b', type: 'TASK', taskId: 't1', orderIndex: 1, days: ['Saturday'] },
      ],
    } as Routine;
    expect(getListStats(list, FRIDAY, FRIDAY).totalItems).toBe(1);
    expect(getListStats(list, SATURDAY, SATURDAY).totalItems).toBe(2);
  });

  it('carries days through the list fallback that reads the internal section', () => {
    const cached = {
      name: 'L',
      iconId: '',
      type: 'LIST',
      routineSections: [
        { id: 's', name: 'L', iconId: '', startTime: '', endTime: '', order: 0, habitGroup: [{ id: 'g', habitId: 'h', startTime: '', days: ['Monday'] }] },
      ],
    } as Routine;
    expect(getListItems(cached)[0].days).toEqual(['Monday']);
  });
});
