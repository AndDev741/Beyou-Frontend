/**
 * The break's micro-tasks (F6) on native: server-owned and scoped to one routine item.
 *
 * Note this suite asserts TRANSLATED text, not i18n keys: it imports `../src/i18n`.
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

jest.mock('@beyou/api/focus/focusApi', () => ({
  listFocusMicroTasks: jest.fn(),
  addFocusMicroTask: jest.fn(),
  toggleFocusMicroTask: jest.fn(),
  pinFocusMicroTask: jest.fn(),
  deleteFocusMicroTask: jest.fn(),
  recordFocusCycle: jest.fn(),
  getFocusDay: jest.fn(),
}));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import type { FocusMicroTask } from '@beyou/types/focus/focus';
import {
  addFocusMicroTask,
  deleteFocusMicroTask,
  listFocusMicroTasks,
  pinFocusMicroTask,
  toggleFocusMicroTask,
} from '@beyou/api/focus/focusApi';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import MicroTasks from '../src/focus/MicroTasks';

const row = (over: Partial<FocusMicroTask> = {}): FocusMicroTask => ({
  id: '1',
  date: '2026-08-28',
  itemGroupId: 'item-a',
  name: 'Stretch',
  pinned: false,
  doneAt: null,
  ...over,
});

// Returns the two things the tests need, named. Spreading the render result loses `store` in the
// inferred type under tsc while jest stays green; jest does not typecheck (AGENTS.md).
const renderTasks = async (itemGroupId = 'item-a', store = makeStore()) => {
  let result!: Awaited<ReturnType<typeof render>>;
  await act(async () => {
    result = await render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <MicroTasks itemGroupId={itemGroupId} />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
  return { store, rerender: result.rerender };
};

const press = async (testID: string) => {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  (listFocusMicroTasks as jest.Mock).mockResolvedValue({ success: [] });
});

describe('the list belongs to the item', () => {
  it('is read from the server for the item on screen', async () => {
    (listFocusMicroTasks as jest.Mock).mockResolvedValue({ success: [row()] });

    await renderTasks('item-a');

    expect(await screen.findByText('Stretch')).toBeTruthy();
    expect(listFocusMicroTasks).toHaveBeenCalledWith('item-a', expect.anything());
  });

  it("switching item re-reads, and shows THAT item's list", async () => {
    (listFocusMicroTasks as jest.Mock).mockImplementation(async (itemGroupId: string) => ({
      success: itemGroupId === 'item-a' ? [row({ name: 'Only on A' })] : [],
    }));
    const { rerender } = await renderTasks('item-a');
    expect(await screen.findByText('Only on A')).toBeTruthy();

    await act(async () => {
      rerender(
        <Provider store={makeStore()}>
          <BeyouThemeProvider>
            <MicroTasks itemGroupId="item-b" />
          </BeyouThemeProvider>
        </Provider>,
      );
    });

    await waitFor(() => expect(listFocusMicroTasks).toHaveBeenCalledWith('item-b', expect.anything()));
    expect(screen.queryByText('Only on A')).toBeNull();
  });
});

describe('mutations go to the server', () => {
  it('adding posts to the item, unpinned', async () => {
    (addFocusMicroTask as jest.Mock).mockResolvedValue({ success: row({ id: '9', name: 'Water' }) });
    await renderTasks();

    await press('focus-micro-task-add');
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('focus-micro-task-input'), 'Water');
    });
    await act(async () => {
      fireEvent(screen.getByTestId('focus-micro-task-input'), 'submitEditing');
    });

    expect(addFocusMicroTask).toHaveBeenCalledWith(
      { itemGroupId: 'item-a', name: 'Water', pinned: false },
      expect.anything(),
    );
    expect(await screen.findByText('Water')).toBeTruthy();
  });

  it('ticking, pinning and removing each call the server and reflect its answer', async () => {
    (listFocusMicroTasks as jest.Mock).mockResolvedValue({ success: [row()] });
    (toggleFocusMicroTask as jest.Mock).mockResolvedValue({ success: row({ doneAt: '2026-08-28T10:00:00Z' }) });
    (pinFocusMicroTask as jest.Mock).mockResolvedValue({ success: row({ pinned: true, doneAt: '2026-08-28T10:00:00Z' }) });
    (deleteFocusMicroTask as jest.Mock).mockResolvedValue({ success: undefined });
    const { store } = await renderTasks();
    await screen.findByText('Stretch');

    await press('focus-micro-task-check-1');
    expect(toggleFocusMicroTask).toHaveBeenCalledWith('1', expect.anything());
    await waitFor(() => expect(store.getState().focus.microTasks['item-a'][0].doneAt).not.toBeNull());

    await press('focus-micro-task-pin-1');
    expect(pinFocusMicroTask).toHaveBeenCalledWith('1', true, expect.anything());
    await waitFor(() => expect(store.getState().focus.microTasks['item-a'][0].pinned).toBe(true));

    await press('focus-micro-task-remove-1');
    expect(deleteFocusMicroTask).toHaveBeenCalledWith('1', expect.anything());
    await waitFor(() => expect(screen.queryByText('Stretch')).toBeNull());
  });

  it('a refused write leaves the list as it was', async () => {
    (addFocusMicroTask as jest.Mock).mockResolvedValue({ error: { message: 'nope' } });
    const { store } = await renderTasks();

    await press('focus-micro-task-add');
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('focus-micro-task-input'), 'Ghost');
    });
    await act(async () => {
      fireEvent(screen.getByTestId('focus-micro-task-input'), 'submitEditing');
    });

    await waitFor(() => expect(addFocusMicroTask).toHaveBeenCalled());
    expect(screen.queryByText('Ghost')).toBeNull();
    expect(store.getState().focus.microTasks['item-a'] ?? []).toEqual([]);
  });
});
