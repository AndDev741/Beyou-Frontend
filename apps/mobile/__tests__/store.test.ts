import { makeStore } from '../src/store';

test('store wires the routines + editRoutine reducers', () => {
  const state = makeStore().getState() as Record<string, unknown>;
  expect(state.routines).toBeDefined();
  expect(state.editRoutine).toBeDefined();
});
