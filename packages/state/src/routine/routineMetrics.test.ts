import { getRoutineStats, countItemsInRoutine } from './routineMetrics';

const routine = {
  name: 'M', iconId: '', routineSections: [{
    id: 's1', name: 'Wake', iconId: '', startTime: '06:00', endTime: '07:00', order: 0,
    habitGroup: [{ habitId: 'h1', startTime: '06:10', habitGroupChecks: [{ checkDate: '2026-06-10', checked: true, xpGenerated: 12 }] }],
    taskGroup: [{ taskId: 't1', startTime: '06:30', taskGroupChecks: [] }],
  }],
} as never;

test('counts items and computes stats for the date', () => {
  expect(countItemsInRoutine(routine)).toBe(2);
  expect(getRoutineStats(routine, '2026-06-10')).toEqual({ totalItems: 2, completedItems: 1, xpEarned: 12 });
  expect(getRoutineStats(routine, '2026-06-11')).toEqual({ totalItems: 2, completedItems: 0, xpEarned: 0 });
});
