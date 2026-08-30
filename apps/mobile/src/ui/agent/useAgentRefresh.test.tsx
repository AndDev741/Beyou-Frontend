import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { useDispatch, useStore } from 'react-redux';
import { useAgentRefresh } from './useAgentRefresh';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
  useStore: jest.fn(),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

jest.mock('@beyou/api/habits/getHabits', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@beyou/api/routine/getRoutines', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@beyou/api/routine/getTodayRoutine', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@beyou/api', () => ({ getLogger: () => ({ error: jest.fn() }) }));
jest.mock('@beyou/api/focus/focusApi', () => ({ listFocusMicroTasks: jest.fn() }));

import getHabits from '@beyou/api/habits/getHabits';
import getRoutines from '@beyou/api/routine/getRoutines';
import getTodayRoutine from '@beyou/api/routine/getTodayRoutine';
import { listFocusMicroTasks } from '@beyou/api/focus/focusApi';

const dispatch = jest.fn();
const typesOf = () => dispatch.mock.calls.map((c) => c[0]?.type);

/**
 * A LIST routine, because it is the shortest thing `getFocusItems` accepts: one entry per item,
 * and `selectedIndex` indexes it directly.
 */
const routineWithEntries = {
  id: 'r1',
  name: 'Evening',
  type: 'LIST',
  routineSections: [],
  items: [
    { id: 'entry-a', type: 'HABIT', habitId: 'h1', orderIndex: 0 },
    { id: 'entry-b', type: 'TASK', taskId: 't1', orderIndex: 1 },
  ],
};

/** What the store holds at the moment the turn ends. */
let storeState: unknown = { todayRoutine: { routine: null }, focus: { selectedIndex: -1 } };

function run(domains: string[]) {
  function Harness() {
    const refresh = useAgentRefresh();
    refresh(domains);
    return null;
  }
  render(<Harness />);
}

beforeEach(() => {
  jest.clearAllMocks();
  (useDispatch as unknown as jest.Mock).mockReturnValue(dispatch);
  storeState = { todayRoutine: { routine: null }, focus: { selectedIndex: -1 } };
  (useStore as unknown as jest.Mock).mockReturnValue({ getState: () => storeState });
  (getHabits as jest.Mock).mockResolvedValue({ success: [{ id: 'h1' }] });
  (getRoutines as jest.Mock).mockResolvedValue({ success: [{ id: 'r1' }] });
  (getTodayRoutine as jest.Mock).mockResolvedValue({ success: { id: 'r1' } });
});

describe('useAgentRefresh (mobile)', () => {
  it('maps a domain to its slice refetch', async () => {
    run(['habits']);
    await waitFor(() => expect(getHabits).toHaveBeenCalled());
    await waitFor(() => expect(typesOf()).toContain('habits/enterHabits'));
  });

  it('routines also refreshes today view', async () => {
    run(['routines']);
    await waitFor(() => expect(typesOf()).toContain('routines/enterRoutines'));
    await waitFor(() => expect(typesOf()).toContain('todayRoutine/enterTodayRoutine'));
  });

  // Regression for #7: a failed getTodayRoutine must not wipe the routine view.
  it('does not dispatch today routine when the fetch failed', async () => {
    (getTodayRoutine as jest.Mock).mockResolvedValue({ error: { message: 'boom' } });
    run(['routines']);
    await waitFor(() => expect(typesOf()).toContain('routines/enterRoutines'));
    expect(typesOf()).not.toContain('todayRoutine/enterTodayRoutine');
  });

  it('ignores an unknown domain without throwing', async () => {
    run(['not-a-slice']);
    await waitFor(() => expect(dispatch).not.toHaveBeenCalled());
  });

  /**
   * Micro-tasks live per routine entry and there is no endpoint that returns them all, so the
   * refresh can only reach the entry the person has open. That is also the only one on screen.
   */
  it('focus refetches the micro-tasks of the entry the user has open', async () => {
    storeState = { todayRoutine: { routine: routineWithEntries }, focus: { selectedIndex: 1 } };
    (listFocusMicroTasks as jest.Mock).mockResolvedValue({ success: [{ id: 'm1' }] });

    run(['focus']);

    await waitFor(() => expect(listFocusMicroTasks).toHaveBeenCalledWith('entry-b', expect.anything()));
    await waitFor(() => expect(typesOf()).toContain('focus/microTasksLoaded'));
  });

  it('focus does nothing when no entry is selected', async () => {
    run(['focus']);

    await waitFor(() => expect(listFocusMicroTasks).not.toHaveBeenCalled());
    expect(typesOf()).not.toContain('focus/microTasksLoaded');
  });
});
