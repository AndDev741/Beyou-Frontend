import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { useDispatch } from 'react-redux';
import { useAgentRefresh } from './useAgentRefresh';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

jest.mock('@beyou/api/habits/getHabits', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@beyou/api/routine/getRoutines', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@beyou/api/routine/getTodayRoutine', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@beyou/api', () => ({ getLogger: () => ({ error: jest.fn() }) }));

import getHabits from '@beyou/api/habits/getHabits';
import getRoutines from '@beyou/api/routine/getRoutines';
import getTodayRoutine from '@beyou/api/routine/getTodayRoutine';

const dispatch = jest.fn();
const typesOf = () => dispatch.mock.calls.map((c) => c[0]?.type);

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
});
