/**
 * The Ideas screen on the phone: the board draws what the server has, capture creates a note
 * without a spot (the server picks it), a held note dragged and let go saves the spot through
 * the shared `dropPosition`, a tap opens the sheet that edits, archives and turns the note into a
 * task, and the archived list puts notes back or deletes them for good.
 *
 * The board is driven through its real PanResponder with hand-built touch events (the shape the
 * responder system hands over), so the finger → board → save path is the one a device runs.
 *
 * Boundary mocked: the quick-note API module, categories and tasks fetches, expo-router, notify.
 */
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack, replace: jest.fn(), canGoBack: () => true }),
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(() => callback(), [callback]),
}));
jest.mock('../src/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
}));
jest.mock('@beyou/api/quickNote/quickNoteApi', () => ({
  getQuickNotes: jest.fn(),
  getArchivedQuickNotes: jest.fn(),
  createQuickNote: jest.fn(),
  editQuickNote: jest.fn(),
  saveQuickNoteLayout: jest.fn(),
  tidyQuickNotes: jest.fn(),
  archiveQuickNote: jest.fn(),
  restoreQuickNote: jest.fn(),
  deleteQuickNote: jest.fn(),
  convertQuickNoteToTask: jest.fn(),
}));
jest.mock('@beyou/api/categories/getCategories', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ success: [{ id: 'c1', name: 'Health', iconId: 'lucide:heart' }] })),
}));
jest.mock('@beyou/api/tasks/getTasks', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ success: [{ id: 'task-1', name: 'Call the bank' }] })),
}));

import { Provider } from 'react-redux';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { setLogger } from '@beyou/api';
import {
  archiveQuickNote,
  convertQuickNoteToTask,
  createQuickNote,
  deleteQuickNote,
  editQuickNote,
  getArchivedQuickNotes,
  getQuickNotes,
  restoreQuickNote,
  saveQuickNoteLayout,
  tidyQuickNotes,
} from '@beyou/api/quickNote/quickNoteApi';
import getTasks from '@beyou/api/tasks/getTasks';
import { dropPosition } from '@beyou/state';
import type { QuickNote } from '@beyou/types/quickNote/quickNote';
import i18n from '../src/i18n';
import { notify } from '../src/notify';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import { iconRecents } from '../src/ui/icons/iconRecents';
import { LONG_PRESS_MS } from '../src/ideas/boardGestures';
import IdeasScreen from '../app/(app)/ideas';

const mocked = {
  get: getQuickNotes as jest.Mock,
  archived: getArchivedQuickNotes as jest.Mock,
  create: createQuickNote as jest.Mock,
  edit: editQuickNote as jest.Mock,
  layout: saveQuickNoteLayout as jest.Mock,
  tidy: tidyQuickNotes as jest.Mock,
  archive: archiveQuickNote as jest.Mock,
  restore: restoreQuickNote as jest.Mock,
  remove: deleteQuickNote as jest.Mock,
  convert: convertQuickNoteToTask as jest.Mock,
};

const note = (overrides: Partial<QuickNote> & { id: string }): QuickNote => ({
  text: `Idea ${overrides.id}`,
  color: 'YELLOW',
  x: 0,
  y: 0,
  z: 1,
  archivedAt: null,
  convertedTaskId: null,
  createdAt: '2026-10-17T10:00:00Z',
  updatedAt: '2026-10-17T10:00:00Z',
  ...overrides,
});

/** Two notes: n1 at the origin, n2 in the next grid cell, in front. */
const BOARD = [note({ id: 'n1', text: 'Buy milk', z: 1 }), note({ id: 'n2', text: 'Call mum', x: 224, z: 2 })];

async function renderScreen(store = makeStore()) {
  await act(async () => {
    render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <IdeasScreen />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
  await waitFor(() => expect(mocked.get).toHaveBeenCalled());
  return store;
}

async function press(testID: string) {
  await act(async () => {
    await fireEvent.press(screen.getByTestId(testID));
  });
}

// ── Fingers on the board ────────────────────────────────────────────────────────────────────
// The board never received a layout in jest, so it keeps its starting view: zoom 1, the board
// origin 24 points in from the top-left. Note n1 covers (24..224, 24..184) on screen.

const HIDDEN = { includeHiddenElements: true };

type Finger = { id: number; x: number; y: number };
let clock = 1000;

/** A responder event as React Native builds it: the finger(s) plus the shared touch history. */
function touchEvent(down: Finger[], changed: Finger[] = down) {
  clock += 16;
  const asTouch = (f: Finger) => ({
    identifier: f.id,
    pageX: f.x,
    pageY: f.y,
    locationX: f.x,
    locationY: f.y,
    timestamp: clock,
  });
  const touchBank: unknown[] = [];
  for (const f of down) {
    touchBank[f.id] = {
      touchActive: true,
      startPageX: f.x,
      startPageY: f.y,
      startTimeStamp: clock,
      currentPageX: f.x,
      currentPageY: f.y,
      currentTimeStamp: clock,
      previousPageX: f.x,
      previousPageY: f.y,
      previousTimeStamp: clock,
    };
  }
  return {
    nativeEvent: { ...asTouch(changed[0] ?? down[0]), touches: down.map(asTouch), changedTouches: changed.map(asTouch) },
    touchHistory: {
      numberActiveTouches: down.length,
      indexOfSingleActiveTouch: down[0]?.id ?? 0,
      mostRecentTimeStamp: clock,
      touchBank,
    },
  };
}

async function board(eventName: string, event: unknown) {
  await act(async () => {
    await fireEvent(screen.getByTestId('ideas-board'), eventName, event);
  });
}

async function fingerDown(at: Finger) {
  await board('responderGrant', touchEvent([at]));
  await board('responderStart', touchEvent([at]));
}

async function fingerUp(at: Finger) {
  await board('responderEnd', touchEvent([], [at]));
  await board('responderRelease', touchEvent([], [at]));
}

async function holdLongEnough() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, LONG_PRESS_MS + 40));
  });
}

async function tapNoteN1() {
  const at = { id: 0, x: 60, y: 60 };
  await fingerDown(at);
  await fingerUp(at);
  await waitFor(() => expect(screen.getByTestId('ideas-note-sheet')).toBeTruthy());
}

beforeEach(() => {
  jest.clearAllMocks();
  setLogger({ error: () => {} });
  iconRecents.clearRecentIcons();
  void i18n.changeLanguage('en');
  mocked.get.mockResolvedValue({ success: BOARD });
  mocked.layout.mockImplementation(async () => ({ success: BOARD }));
});

describe('IdeasScreen board', () => {
  it('draws every note from the server, labelled for screen readers, and counts them', async () => {
    await renderScreen();

    const milk = await screen.findByLabelText('Note: Buy milk');
    expect(milk.props.accessibilityHint).toBe('Drag to move');
    expect(screen.getByLabelText('Note: Call mum')).toBeTruthy();
    expect(screen.getByTestId('ideas-count')).toHaveTextContent('2 of 200 notes');
  });

  it('shows the empty board with how to start', async () => {
    mocked.get.mockResolvedValue({ success: [] });
    await renderScreen();

    const empty = await screen.findByTestId('ideas-empty');
    expect(within(empty).getByText('The board is empty')).toBeTruthy();
    expect(within(empty).getByText('Hold a note to drag it. Pinch to zoom.')).toBeTruthy();
  });

  it('offers to try again when the first load fails', async () => {
    mocked.get.mockResolvedValueOnce({ error: { message: 'down' } });
    await renderScreen();

    expect(await screen.findByTestId('ideas-error')).toBeTruthy();
    await act(async () => {
      await fireEvent.press(screen.getByText('Try again'));
    });
    await screen.findByLabelText('Note: Buy milk');
  });

  it('saves a held and dragged note where it was let go, through dropPosition', async () => {
    const store = await renderScreen();
    await screen.findByLabelText('Note: Buy milk');

    await fingerDown({ id: 0, x: 60, y: 60 });
    await holdLongEnough();
    // The stand-in that follows the finger is hidden from screen readers: the note itself is
    // still where it was for them.
    expect(screen.getByTestId('ideas-drag-ghost', HIDDEN)).toBeTruthy();

    await board('responderMove', touchEvent([{ id: 0, x: 160, y: 100 }]));
    await fingerUp({ id: 0, x: 160, y: 100 });

    // 100 and 40 points of finger at zoom 1 are 100 and 40 board units; n1 comes to the front.
    const expected = dropPosition(BOARD, 'n1', { x: 100, y: 40 });
    expect(expected).toEqual({ id: 'n1', x: 100, y: 40, z: 3 });
    await waitFor(() => expect(mocked.layout).toHaveBeenCalledWith([expected], expect.anything()));
    const moved = store.getState().quickNotes.active.find((n) => n.id === 'n1');
    expect(moved).toMatchObject({ x: 100, y: 40, z: 3 });
    expect(screen.queryByTestId('ideas-drag-ghost', HIDDEN)).toBeNull();
  });

  it('re-reads the board when a drop fails to save', async () => {
    mocked.layout.mockResolvedValueOnce({ error: { errorKey: 'QUICK_NOTE_NOT_FOUND' } });
    await renderScreen();
    await screen.findByLabelText('Note: Buy milk');

    await fingerDown({ id: 0, x: 60, y: 60 });
    await holdLongEnough();
    await board('responderMove', touchEvent([{ id: 0, x: 90, y: 60 }]));
    await fingerUp({ id: 0, x: 90, y: 60 });

    await waitFor(() => expect(notify.error).toHaveBeenCalledWith(i18n.t('QUICK_NOTE_NOT_FOUND')));
    await waitFor(() => expect(mocked.get).toHaveBeenCalledTimes(2));
  });

  it('pans on a quick swipe instead of moving the note', async () => {
    await renderScreen();
    await screen.findByLabelText('Note: Buy milk');

    await fingerDown({ id: 0, x: 60, y: 60 });
    await board('responderMove', touchEvent([{ id: 0, x: 160, y: 60 }]));
    await fingerUp({ id: 0, x: 160, y: 60 });

    expect(mocked.layout).not.toHaveBeenCalled();
    expect(screen.queryByTestId('ideas-note-sheet')).toBeNull();
  });
});

describe('IdeasScreen capture', () => {
  it('creates the note without a spot and shows it on the board', async () => {
    mocked.create.mockResolvedValue({ success: note({ id: 'n3', text: 'Learn chess', x: 448, z: 3 }) });
    await renderScreen();

    await act(async () => {
      await fireEvent.changeText(screen.getByTestId('ideas-capture'), '  Learn chess ');
    });
    await act(async () => {
      await fireEvent(screen.getByTestId('ideas-capture'), 'submitEditing');
    });

    expect(mocked.create).toHaveBeenCalledWith({ text: 'Learn chess' }, expect.anything());
    expect(await screen.findByLabelText('Note: Learn chess')).toBeTruthy();
    expect(screen.getByTestId('ideas-capture').props.value).toBe('');
  });

  // Seen on an emulator: Enter arrived before the last onChangeText render and the note was saved
  // as "Nova ideia do celu". The keyboard's own text is the one to trust.
  it('saves the text Enter carried, even when the field state is a few letters behind', async () => {
    mocked.create.mockResolvedValue({ success: note({ id: 'n4', text: 'Nova ideia do celular', x: 448, z: 3 }) });
    await renderScreen();

    await act(async () => {
      await fireEvent.changeText(screen.getByTestId('ideas-capture'), 'Nova ideia do celu');
    });
    await act(async () => {
      await fireEvent(screen.getByTestId('ideas-capture'), 'submitEditing', {
        nativeEvent: { text: 'Nova ideia do celular' },
      });
    });

    expect(mocked.create).toHaveBeenCalledWith({ text: 'Nova ideia do celular' }, expect.anything());
  });

  it('says the board is full in words when the server refuses', async () => {
    mocked.create.mockResolvedValue({ error: { errorKey: 'QUICK_NOTE_LIMIT_REACHED' } });
    await renderScreen();

    await act(async () => {
      await fireEvent.changeText(screen.getByTestId('ideas-capture'), 'One more');
    });
    await press('ideas-capture-submit');

    expect(notify.error).toHaveBeenCalledWith('The board is full at 200 notes. Archive a few to make room.');
    // What was typed stays, so nothing is lost.
    expect(screen.getByTestId('ideas-capture').props.value).toBe('One more');
  });
});

describe('IdeasScreen note sheet', () => {
  it('opens on a tap and saves the new text and colour', async () => {
    mocked.edit.mockResolvedValue({ success: { ...BOARD[0], text: 'Buy oat milk', color: 'PINK' } });
    const store = await renderScreen();
    await screen.findByLabelText('Note: Buy milk');
    await tapNoteN1();

    expect(screen.getByLabelText('Pink').props.accessibilityState?.checked).toBe(false);
    await act(async () => {
      await fireEvent.changeText(screen.getByTestId('ideas-note-text'), 'Buy oat milk');
    });
    await press('ideas-color-PINK');
    expect(screen.getByLabelText('Pink').props.accessibilityState?.checked).toBe(true);
    await press('ideas-note-save');

    expect(mocked.edit).toHaveBeenCalledWith('n1', { text: 'Buy oat milk', color: 'PINK' }, expect.anything());
    await waitFor(() => expect(screen.queryByTestId('ideas-note-sheet')).toBeNull());
    expect(store.getState().quickNotes.active.find((n) => n.id === 'n1')?.color).toBe('PINK');
  });

  it('opens through the screen reader activate action as well', async () => {
    await renderScreen();
    const milk = await screen.findByLabelText('Note: Buy milk');

    await act(async () => {
      await fireEvent(milk, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    });

    expect(screen.getByTestId('ideas-note-sheet')).toBeTruthy();
  });

  it('archives the note off the board', async () => {
    mocked.archive.mockResolvedValue({ success: { ...BOARD[0], archivedAt: '2026-10-17T11:00:00Z' } });
    await renderScreen();
    await screen.findByLabelText('Note: Buy milk');
    await tapNoteN1();

    await press('ideas-note-archive');

    expect(mocked.archive).toHaveBeenCalledWith('n1', expect.anything());
    expect(notify.success).toHaveBeenCalledWith('Note archived');
    await waitFor(() => expect(screen.queryByLabelText('Note: Buy milk')).toBeNull());
    expect(screen.getByTestId('ideas-count')).toHaveTextContent('1 of 200 notes');
  });

  it('turns the note into a task through the prefilled task form', async () => {
    const multiline = note({ id: 'n1', text: 'Call the bank\nAsk about the card fee' });
    mocked.get.mockResolvedValue({ success: [multiline] });
    mocked.convert.mockResolvedValue({
      success: { note: { ...multiline, archivedAt: '2026-10-17T11:00:00Z', convertedTaskId: 'task-1' }, taskId: 'task-1' },
    });
    const store = await renderScreen();
    await screen.findByLabelText('Note: Call the bank\nAsk about the card fee');
    await tapNoteN1();

    await press('ideas-note-make-task');

    expect(await screen.findByText('Task from a note')).toBeTruthy();
    expect(screen.getByTestId('task-name').props.value).toBe('Call the bank');
    expect(screen.getByTestId('task-description').props.value).toBe('Ask about the card fee');

    await press('task-icon');
    await act(async () => {
      await fireEvent.changeText(screen.getByTestId('icon-picker-search'), 'house');
    });
    await act(async () => {
      await fireEvent.press(screen.getAllByLabelText(/^Icon: /)[0]);
    });
    await press('task-form-submit');

    await waitFor(() =>
      expect(mocked.convert).toHaveBeenCalledWith(
        'n1',
        expect.objectContaining({ name: 'Call the bank', description: 'Ask about the card fee', iconId: expect.any(String) }),
        expect.anything(),
      ),
    );
    expect(notify.success).toHaveBeenCalledWith('Task created. The note moved to Archived.');
    await waitFor(() => expect(screen.queryByTestId('task-form')).toBeNull());
    expect(store.getState().quickNotes.active).toHaveLength(0);
    await waitFor(() => expect(getTasks).toHaveBeenCalled());
    await waitFor(() => expect(store.getState().tasks.tasks).toEqual([{ id: 'task-1', name: 'Call the bank' }]));
  });
});

describe('IdeasScreen toolbar', () => {
  it('tidies the board from the server answer', async () => {
    const tidied = [note({ id: 'n2', text: 'Call mum', x: 0, z: 0 }), note({ id: 'n1', text: 'Buy milk', x: 224, z: 1 })];
    mocked.tidy.mockResolvedValue({ success: tidied });
    const store = await renderScreen();
    await screen.findByLabelText('Note: Buy milk');

    await press('ideas-tidy');

    expect(mocked.tidy).toHaveBeenCalled();
    expect(store.getState().quickNotes.active.map((n) => [n.id, n.x])).toEqual([
      ['n2', 0],
      ['n1', 224],
    ]);
  });

  it('lists archived notes on open, says which became a task, restores and deletes', async () => {
    const converted = note({ id: 'a1', text: 'Pay rent', archivedAt: '2026-10-16T10:00:00Z', convertedTaskId: 't9' });
    const plain = note({ id: 'a2', text: 'Old thought', archivedAt: '2026-10-15T10:00:00Z' });
    mocked.archived.mockResolvedValue({ success: [converted, plain] });
    mocked.restore.mockResolvedValue({ success: { ...plain, archivedAt: null, z: 3 } });
    mocked.remove.mockResolvedValue({ success: true });
    await renderScreen();
    await screen.findByLabelText('Note: Buy milk');

    await press('ideas-archived');

    await screen.findByTestId('ideas-archived-a1');
    expect(mocked.archived).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('ideas-archived-task-a1')).toHaveTextContent('Became a task');
    expect(screen.queryByTestId('ideas-archived-task-a2')).toBeNull();

    await press('ideas-restore-a2');
    expect(mocked.restore).toHaveBeenCalledWith('a2', expect.anything());
    expect(notify.success).toHaveBeenCalledWith('Note is back on the board');
    await waitFor(() => expect(screen.queryByTestId('ideas-archived-a2')).toBeNull());
    expect(screen.getByLabelText('Note: Old thought')).toBeTruthy();

    await press('ideas-delete-a1');
    expect(screen.getByText("Delete this note for good? There's no undo.")).toBeTruthy();
    await press('ideas-delete-modal-confirm');
    expect(mocked.remove).toHaveBeenCalledWith('a1', expect.anything());
    await waitFor(() => expect(screen.getByTestId('ideas-archived-empty')).toBeTruthy());
  });

  it('fits the board without asking the server anything', async () => {
    await renderScreen();
    await screen.findByLabelText('Note: Buy milk');
    await press('ideas-fit');
    expect(mocked.layout).not.toHaveBeenCalled();
    expect(mocked.get).toHaveBeenCalledTimes(1);
  });
});
