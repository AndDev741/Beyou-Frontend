import { sortRoutines } from './sortRoutines';
const R = (name: string, level: number, xp: number) => ({ name, level, xp, iconId: '', routineSections: [] }) as never;

test('name-asc / level-desc / xp-desc + default passthrough', () => {
  const list = [R('B', 1, 50), R('A', 3, 10), R('C', 2, 99)];
  expect(sortRoutines(list, 'name-asc').map((r) => r.name)).toEqual(['A', 'B', 'C']);
  expect(sortRoutines(list, 'level-desc').map((r) => r.name)).toEqual(['A', 'C', 'B']);
  expect(sortRoutines(list, 'xp-desc').map((r) => r.name)).toEqual(['C', 'B', 'A']);
  expect(sortRoutines(list, 'default')).toEqual(list); // new array, same order
});
