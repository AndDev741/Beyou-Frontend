/**
 * RoutineDay + check-in (P3-T5) — empty state, item rendering, and the core
 * check loop: press a habit -> POST /routine/check -> applyRefreshUi updates the
 * perfil (XP) and marks the item checked.
 *
 * Toast is stubbed (no-op) to avoid its Animated timers under jest.
 */
jest.mock('react-native-toast-message', () => {
  const S = () => null;
  (S as unknown as { show: unknown }).show = jest.fn();
  (S as unknown as { hide: unknown }).hide = jest.fn();
  return { __esModule: true, default: S };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import { enterTodayRoutine } from '@beyou/state/routine/todayRoutineSlice';
import { enterHabits } from '@beyou/state/habit/habitsSlice';
import { hydratePerfil } from '@beyou/state/user/perfilSlice';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import RoutineDay from '../src/ui/dashboard/RoutineDay';

const today = new Date().toJSON().slice(0, 10);

function seedRoutineStore() {
  const store = makeStore();
  store.dispatch(hydratePerfil({ name: 'A', xp: 0, level: 1, constance: 0, actualLevelXp: 0, nextLevelXp: 100 }));
  store.dispatch(enterHabits([{ id: 'h1', name: 'Read', motivationalPhrase: 'Nice!' }] as never));
  store.dispatch(
    enterTodayRoutine({
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
          habitGroup: [{ id: 'hg1', habitId: 'h1', startTime: '06:00', endTime: '06:30', habitGroupChecks: [] }],
        },
      ],
    } as never),
  );
  return store;
}

function fakeCheckHttp(refresh: unknown) {
  const noop = async () => ({ data: null });
  setHttpClient({
    get: noop,
    post: async (url: string) => (url === '/routine/check' ? { data: refresh } : { data: null }),
    put: noop,
    delete: noop,
  } as never);
  setLogger({ error: () => {} });
}

const renderDay = (store: ReturnType<typeof makeStore>) =>
  render(
    <Provider store={store}>
      <BeyouThemeProvider>
        <RoutineDay />
      </BeyouThemeProvider>
    </Provider>,
  );

describe('RoutineDay', () => {
  it('shows the empty state when there is no routine', async () => {
    await renderDay(makeStore());
    expect(screen.getByTestId('routine-empty')).toBeTruthy();
  });

  it('renders the routine name and its resolved habit item', async () => {
    fakeCheckHttp(null);
    await renderDay(seedRoutineStore());
    expect(screen.getByText('My Routine')).toBeTruthy();
    expect(screen.getByText('Read')).toBeTruthy();
    expect(screen.getByTestId('routine-check-hg1')).toBeTruthy();
  });

  it('checks an item -> calls the API and applies the refresh (XP + checked)', async () => {
    const refresh = {
      refreshUser: {
        xp: 50,
        level: 1,
        currentConstance: 1,
        maxConstance: 1,
        alreadyIncreaseConstanceToday: true,
        nextLevelXp: 100,
        actualLevelXp: 0,
      },
      refreshItemChecked: {
        groupItemId: 'hg1',
        check: { id: 'k1', checkDate: today, checkTime: '06:05', checked: true, skipped: false, xpGenerated: 50 },
      },
    };
    fakeCheckHttp(refresh);
    const store = seedRoutineStore();
    await renderDay(store);

    await act(async () => {
      fireEvent.press(screen.getByTestId('routine-check-hg1'));
    });

    await waitFor(() => expect(store.getState().perfil.xp).toBe(50));
    // item now checked -> skip button gone
    expect(screen.queryByTestId('routine-skip-hg1')).toBeNull();
  });
});
