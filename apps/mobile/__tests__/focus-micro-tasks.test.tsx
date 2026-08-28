/**
 * The break's micro-tasks (F4) on native.
 *
 * What only this side can check: that the standing ones round-trip through SecureStore, which is
 * where they live until F6 puts them on the server. Note this suite asserts TRANSLATED text, not
 * i18n keys: it imports `../src/i18n`.
 */
jest.mock('react-native-toast-message', () => {
  const S = () => null;
  (S as unknown as { show: unknown }).show = jest.fn();
  (S as unknown as { hide: unknown }).hide = jest.fn();
  return { __esModule: true, default: S };
});

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(() => callback(), [callback]),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));

// One in-memory store standing in for the device's, so a write can be read back.
const mockSecureStore: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: (key: string) => Promise.resolve(mockSecureStore[key] ?? null),
  setItemAsync: (key: string, value: string) => {
    mockSecureStore[key] = value;
    return Promise.resolve();
  },
  deleteItemAsync: (key: string) => {
    delete mockSecureStore[key];
    return Promise.resolve();
  },
}));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import MicroTasks from '../src/focus/MicroTasks';

const DATE = '2026-08-28';
const KEY = 'beyou.focusMicroTasks';

const renderTasks = async (date = DATE, store = makeStore()) => {
  await act(async () => {
    render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <MicroTasks date={date} />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
  return store;
};

const press = async (testID: string) => {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
};

const add = async (name: string) => {
  const opener = screen.queryByTestId('focus-micro-task-add');
  if (opener) {
    await act(async () => {
      fireEvent.press(opener);
    });
  }
  await act(async () => {
    fireEvent.changeText(screen.getByTestId('focus-micro-task-input'), name);
  });
  await act(async () => {
    fireEvent(screen.getByTestId('focus-micro-task-input'), 'submitEditing');
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  for (const key of Object.keys(mockSecureStore)) delete mockSecureStore[key];
});

describe('adding', () => {
  it('lands as a one-off, because pinning is a separate deliberate tap', async () => {
    const store = await renderTasks();

    await add('Stretch');

    expect(screen.getByText('Stretch')).toBeTruthy();
    expect(store.getState().focus.microTasks[0]).toMatchObject({
      name: 'Stretch',
      pinned: false,
    });
  });

  it('adds nothing for an empty name', async () => {
    const store = await renderTasks();

    await press('focus-micro-task-add');
    await act(async () => {
      fireEvent(screen.getByTestId('focus-micro-task-input'), 'submitEditing');
    });

    expect(store.getState().focus.microTasks).toEqual([]);
  });
});

describe('what reaches the device store', () => {
  it('a pinned one is written; a one-off never is', async () => {
    await renderTasks();
    await add('One-off');
    await add('Standing');

    expect(JSON.parse(mockSecureStore[KEY] ?? '[]')).toHaveLength(0);

    await press('focus-micro-task-pin-2');

    await waitFor(() => {
      const stored = JSON.parse(mockSecureStore[KEY] ?? '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe('Standing');
    });
  });

  it('is read back on mount', async () => {
    mockSecureStore[KEY] = JSON.stringify([
      { id: '7', name: 'Water', pinned: true, doneOn: null },
    ]);

    await renderTasks();

    expect(await screen.findByText('Water')).toBeTruthy();
  });

  it('junk is ignored rather than crashing the render', async () => {
    mockSecureStore[KEY] = '[{"id":1},{"name":""},null,"nope"]';

    await renderTasks();

    expect(screen.getByTestId('focus-micro-tasks')).toBeTruthy();
    expect(screen.getByTestId('focus-micro-task-add')).toBeTruthy();
  });

  it('unreadable storage is ignored too', async () => {
    mockSecureStore[KEY] = '{not json';

    await renderTasks();

    expect(screen.getByTestId('focus-micro-tasks')).toBeTruthy();
  });
});

describe('ticking', () => {
  it("done is a DATE, so a pinned one comes back fresh tomorrow", async () => {
    mockSecureStore[KEY] = JSON.stringify([
      { id: '7', name: 'Water', pinned: true, doneOn: null },
    ]);
    const store = await renderTasks();
    await screen.findByText('Water');

    await press('focus-micro-task-check-7');
    expect(store.getState().focus.microTasks[0].doneOn).toBe(DATE);

    // A stale tick is not written, so tomorrow reads as not done.
    await waitFor(() => {
      const stored = JSON.parse(mockSecureStore[KEY] ?? '[]');
      expect(stored[0].doneOn).toBe(DATE);
    });
    await renderTasks('2026-08-29', makeStore());
    await waitFor(() => {
      const stored = JSON.parse(mockSecureStore[KEY] ?? '[]');
      expect(stored[0].doneOn).toBeNull();
    });
  });
});

describe('removing', () => {
  it('takes it off the list and out of the device store', async () => {
    await renderTasks();
    await add('Stretch');
    await press('focus-micro-task-pin-1');
    await waitFor(() => expect(JSON.parse(mockSecureStore[KEY] ?? '[]')).toHaveLength(1));

    await press('focus-micro-task-remove-1');

    expect(screen.queryByText('Stretch')).toBeNull();
    await waitFor(() => expect(JSON.parse(mockSecureStore[KEY] ?? '[]')).toHaveLength(0));
  });
});
