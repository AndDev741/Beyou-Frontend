/**
 * useFocusRoutine joins the auto-refresh policy.
 *
 * The focus screen was the one data screen without `useAutoRefresh`, on the platform where it
 * matters most: the Stack keeps it mounted under whatever is pushed on top, so its mount fetch
 * runs once, and a habit renamed on the web during a pomodoro never reached it. The hook is
 * replaced by a capture here; what is under test is what the loader does when it fires.
 */
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(() => callback(), [callback]),
}));

const mockAutoRefresh: { refresh: ((reason: string) => Promise<unknown>) | null } = {
  refresh: null,
};
jest.mock('../src/hooks/useAutoRefresh', () => ({
  useAutoRefresh: (refresh: (reason: string) => Promise<unknown>) => {
    mockAutoRefresh.refresh = refresh;
  },
}));

jest.mock('@beyou/api/routine/getTodayRoutine', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@beyou/api/habits/getHabits', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@beyou/api/tasks/getTasks', () => ({ __esModule: true, default: jest.fn() }));

import { Text } from 'react-native';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import getTodayRoutine from '@beyou/api/routine/getTodayRoutine';
import getHabits from '@beyou/api/habits/getHabits';
import getTasks from '@beyou/api/tasks/getTasks';
import '../src/i18n';
import { makeStore } from '../src/store';
import { useFocusRoutine } from '../src/focus/useFocusRoutine';

const mockedRoutine = getTodayRoutine as jest.Mock;
const mockedHabits = getHabits as jest.Mock;
const mockedTasks = getTasks as jest.Mock;

const habit = (name: string) => ({ id: 'h-1', name, iconId: 'icon', motivationalPhrase: '' });

function Probe() {
  const { error } = useFocusRoutine();
  return <Text>{error ?? 'no-error'}</Text>;
}

function renderProbe() {
  const store = makeStore();
  render(
    <Provider store={store}>
      <Probe />
    </Provider>,
  );
  return store;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAutoRefresh.refresh = null;
  mockedRoutine.mockResolvedValue({ success: null });
  mockedHabits.mockResolvedValue({ success: [habit('Drink water')] });
  mockedTasks.mockResolvedValue({ success: [] });
});

test('a refresh brings a rename made elsewhere into the habits slice', async () => {
  const store = renderProbe();

  await waitFor(() => expect(store.getState().habits.habits[0]?.name).toBe('Drink water'));
  expect(mockAutoRefresh.refresh).not.toBeNull();

  mockedHabits.mockResolvedValue({ success: [habit('Drink water, renamed')] });
  await act(async () => {
    await mockAutoRefresh.refresh!('foreground');
  });

  expect(store.getState().habits.habits[0]?.name).toBe('Drink water, renamed');
  expect(mockedHabits).toHaveBeenCalledTimes(2);
});

test('a background refresh that fails keeps the slice and stays quiet', async () => {
  const store = renderProbe();
  await waitFor(() => expect(store.getState().habits.habits[0]?.name).toBe('Drink water'));

  mockedHabits.mockResolvedValue({ error: 'RATE_LIMIT' });
  await act(async () => {
    await mockAutoRefresh.refresh!('interval');
  });

  expect(store.getState().habits.habits[0]?.name).toBe('Drink water');
  expect(screen.getByText('no-error')).toBeTruthy();
});
