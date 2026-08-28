/**
 * Focus Mode F1 on native: the screen fetches what the routine renderer needs, marks the
 * focus mode, and the routine card stops offering the way in once it is inside the screen.
 */
jest.mock('react-native-toast-message', () => {
  const S = () => null;
  (S as unknown as { show: unknown }).show = jest.fn();
  (S as unknown as { hide: unknown }).hide = jest.fn();
  return { __esModule: true, default: S };
});

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn(() => true);
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(() => callback(), [callback]),
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => mockCanGoBack(),
  }),
}));

jest.mock('@beyou/api/routine/getTodayRoutine', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@beyou/api/habits/getHabits', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@beyou/api/tasks/getTasks', () => ({ __esModule: true, default: jest.fn() }));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import getTodayRoutine from '@beyou/api/routine/getTodayRoutine';
import getHabits from '@beyou/api/habits/getHabits';
import getTasks from '@beyou/api/tasks/getTasks';
import { enterTodayRoutine } from '@beyou/state/routine/todayRoutineSlice';
import { enterHabits } from '@beyou/state/habit/habitsSlice';
import { focusEntered } from '@beyou/state';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import FocusScreen from '../app/focus';
import RoutineDay from '../src/ui/dashboard/RoutineDay';

const routine = {
  id: 'r1',
  name: 'My Routine',
  iconId: '',
  routineSections: [
    {
      id: 's1',
      name: 'Morning',
      iconId: '',
      startTime: '06:00',
      endTime: '07:00',
      order: 0,
      taskGroup: [],
      habitGroup: [
        { id: 'hg1', habitId: 'h1', startTime: '06:00', endTime: '06:30', habitGroupChecks: [] },
      ],
    },
  ],
};

const habits = [{ id: 'h1', name: 'Read', iconId: '' }];

function renderWith(ui: React.ReactElement, store = makeStore()) {
  return {
    store,
    ...render(
      <Provider store={store}>
        <BeyouThemeProvider>{ui}</BeyouThemeProvider>
      </Provider>,
    ),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCanGoBack.mockReturnValue(true);
  (getTodayRoutine as jest.Mock).mockResolvedValue({ success: routine });
  (getHabits as jest.Mock).mockResolvedValue({ success: habits });
  (getTasks as jest.Mock).mockResolvedValue({ success: [] });
});

describe('focus screen', () => {
  it('fetches habits and tasks too, not only the routine', async () => {
    // The routine carries item groups; names live in the habits and tasks slices, and
    // RoutineDay renders nothing for a group it cannot resolve. Opened from a cold start
    // with only the routine, the screen would draw an empty routine.
    await act(async () => {
      renderWith(<FocusScreen />);
    });

    expect(getTodayRoutine).toHaveBeenCalled();
    expect(getHabits).toHaveBeenCalled();
    expect(getTasks).toHaveBeenCalled();
  });

  it('marks focus as entered so the routine card hides its own way in', async () => {
    const { store } = renderWith(<FocusScreen />);

    await waitFor(() => expect(store.getState().focus.mode).toBe('fullscreen'));
  });

  it('leaves through the exit control', async () => {
    await act(async () => {
      renderWith(<FocusScreen />);
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('focus-exit'));
    });

    expect(mockBack).toHaveBeenCalled();
  });

  it('falls back to the dashboard when opened with nothing beneath it', async () => {
    // A deep link or a cold start onto /focus has an empty stack, and back() alone would
    // strand the user on a screen with no way out.
    mockCanGoBack.mockReturnValueOnce(false);

    await act(async () => {
      renderWith(<FocusScreen />);
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('focus-exit'));
    });

    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('surfaces a failed HABITS fetch too, since the rows come from it', async () => {
    (getHabits as jest.Mock).mockResolvedValue({ error: 'Habits are down' });

    await act(async () => {
      renderWith(<FocusScreen />);
    });

    expect(screen.getByTestId('focus-error')).toBeTruthy();
  });

  it('says a failed fetch failed instead of claiming nothing is scheduled', async () => {
    (getTodayRoutine as jest.Mock).mockResolvedValue({ error: 'Network is down' });

    await act(async () => {
      renderWith(<FocusScreen />);
    });

    expect(screen.getByTestId('focus-error')).toBeTruthy();
    expect(screen.queryByTestId('routine-empty')).toBeNull();
  });
});

describe('focus entry button on the routine card', () => {
  const seeded = () => {
    const store = makeStore();
    store.dispatch(enterHabits(habits as never));
    store.dispatch(enterTodayRoutine(routine as never));
    return store;
  };

  it('offered while focus is off, and opens the focus route', async () => {
    const store = seeded();
    await act(async () => {
      renderWith(<RoutineDay />, store);
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('focus-enter'));
    });

    expect(mockPush).toHaveBeenCalledWith('/focus');
  });

  it('hidden once focus is on, since the focus screen renders this same card', async () => {
    const store = seeded();
    store.dispatch(focusEntered(new Date().toJSON().slice(0, 10)));

    await act(async () => {
      renderWith(<RoutineDay />, store);
    });

    expect(screen.queryByTestId('focus-enter')).toBeNull();
  });

  it('not offered when there is no routine today', async () => {
    await act(async () => {
      renderWith(<RoutineDay />, makeStore());
    });

    expect(screen.queryByTestId('focus-enter')).toBeNull();
    expect(screen.getByTestId('routine-empty')).toBeTruthy();
  });
});
