/**
 * The phone's notes editor. BlockNote runs in a web view jest has no browser for, so the web view
 * (NotebookEditorDom) is replaced by a stand-in that keeps the props it was given and answers
 * the screen's calls with spies. What is under test is the screen's half of the bridge: the page
 * it starts the editor from, the network it lends the editor's sync, the toolbar's commands, the
 * conflict question, and leaving only once the last edit is on the server.
 * Boundary mocked = @beyou/api HttpClient + expo-router + notify + the web view.
 */
jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true };
const mockNavigation = {
  listeners: {} as Record<string, (event: unknown) => void>,
  addListener: (name: string, listener: (event: unknown) => void) => {
    mockNavigation.listeners[name] = listener;
    return () => delete mockNavigation.listeners[name];
  },
  dispatch: jest.fn(),
};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useNavigation: () => mockNavigation,
  useLocalSearchParams: () => ({ id: 'ds' }),
}));

const mockEditor = {
  props: null as null | Record<string, any>,
  handle: { command: jest.fn(), serverChanged: jest.fn(), resolve: jest.fn(), flush: jest.fn() },
};
jest.mock('../src/notebook/editor/NotebookEditorDom', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: function NotebookEditorDomStandIn(props: Record<string, any>) {
      mockEditor.props = props;
      React.useImperativeHandle(props.ref, () => mockEditor.handle);
      return null;
    },
  };
});

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { ApiError, setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import NotebookEditorScreen from '../app/notebook-editor';

const notes = JSON.stringify([{ id: 'a', type: 'paragraph', content: [{ type: 'text', text: 'Heaps', styles: {} }] }]);
const page = {
  id: 'ds', kind: 'PAGE', topicId: 'se', parentId: 'se', title: 'Data Structures', icon: null, description: null,
  content: notes, contentRevision: 4,
  status: 'STUDYING', statusManual: false, hasBoard: false, progress: { done: 0, total: 1 },
  breadcrumb: [{ id: 'se', title: 'Software Engineering', icon: null }, { id: 'ds', title: 'Data Structures', icon: null }],
  goal: null, category: null, habit: null, focusMinutes: 0, cardsTotal: 3, cardsDue: 0, sourcesCount: 0,
  updatedAt: '2026-10-09T00:00:00Z',
};

let puts: { url: string; body: any }[] = [];
let patches: { url: string; body: any }[] = [];
let refuseNextSave = false;

beforeEach(() => {
  puts = [];
  patches = [];
  refuseNextSave = false;
  mockEditor.props = null;
  mockNavigation.listeners = {};
  jest.clearAllMocks();
  setLogger({ error: () => {} });
  setHttpClient({
    get: async () => ({ data: page, headers: {} }),
    post: async () => ({ data: {}, headers: {} }),
    put: async (url: string, body: any) => {
      puts.push({ url, body });
      if (refuseNextSave) throw new ApiError(400, { errorKey: 'NOTEBOOK_CONTENT_CONFLICT' });
      return { data: { id: 'ds', updatedAt: '2026-10-09T00:00:01Z', contentRevision: body.baseRevision + 1 }, headers: {} };
    },
    patch: async (url: string, body: any) => {
      patches.push({ url, body });
      return { data: { ...page, ...body }, headers: {} };
    },
    delete: async () => ({ data: {}, headers: {} }),
  } as never);
});

async function renderEditor() {
  const store = makeStore();
  await act(async () => {
    render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <NotebookEditorScreen />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
  await waitFor(() => expect(mockEditor.props).not.toBeNull(), { timeout: 5000 });
  return store;
}

describe('NotebookEditorScreen', () => {
  it('starts the editor from the page as the server has it now', async () => {
    await renderEditor();

    expect(mockEditor.props!.content).toBe(notes);
    expect(mockEditor.props!.revision).toBe(4);
    expect(screen.getByTestId('editor-title').props.value).toBe('Data Structures');
  });

  it("saves from the editor's revision, and tells it when the server refused that revision", async () => {
    await renderEditor();

    let answer: unknown;
    await act(async () => {
      answer = await mockEditor.props!.save('[]', 4);
    });
    expect(puts).toEqual([{ url: '/notebook/pages/ds/content', body: { content: '[]', baseRevision: 4 } }]);
    expect(answer).toEqual({ saved: true, revision: 5 });

    refuseNextSave = true;
    await act(async () => {
      answer = await mockEditor.props!.save('[]', 4);
    });
    expect(answer).toEqual({ saved: false, conflict: true });
  });

  it('asks which version to keep when a block changed on both sides, and hands the answer back', async () => {
    await renderEditor();
    const block = (text: string) => ({ id: 'b', type: 'paragraph', content: [{ type: 'text', text, styles: {} }] });

    await act(async () => {
      await mockEditor.props!.onConflict({
        slots: [],
        conflicts: [{ id: 'b', mine: block('From the phone'), theirs: block('From the computer') }],
      });
    });
    expect(screen.getByTestId('conflict-sheet')).toBeTruthy();
    expect(screen.getByText('From the phone')).toBeTruthy();
    expect(screen.getByText('From the computer')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('conflict-mine'));
    });
    expect(mockEditor.handle.resolve).toHaveBeenCalledWith({ b: 'mine' });
    expect(screen.queryByTestId('conflict-sheet')).toBeNull();
  });

  it('sends the toolbar to the editor as commands', async () => {
    await renderEditor();

    await act(async () => {
      fireEvent.press(screen.getByTestId('editor-bold'));
    });
    expect(mockEditor.handle.command).toHaveBeenLastCalledWith({ kind: 'style', style: 'bold' });

    await act(async () => {
      fireEvent.press(screen.getByTestId('editor-insert'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('editor-block-heading2'));
    });
    expect(mockEditor.handle.command).toHaveBeenLastCalledWith({ kind: 'insert', block: 'heading2' });
  });

  it('lights the buttons that apply where the cursor is', async () => {
    await renderEditor();

    await act(async () => {
      await mockEditor.props!.onFormat({
        styles: { bold: true, italic: false, underline: false, strike: false, code: false },
        link: null, block: 'checkListItem', canIndent: false, canOutdent: false,
      });
    });

    expect(screen.getByTestId('editor-bold').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('editor-italic').props.accessibilityState.selected).toBe(false);
    expect(screen.getByTestId('editor-checklist').props.accessibilityState.selected).toBe(true);
  });

  it('leaving with an edit not yet saved sends it and waits for the answer', async () => {
    await renderEditor();
    await act(async () => {
      await mockEditor.props!.onPending(true);
    });

    const event = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };
    await act(async () => {
      mockNavigation.listeners.beforeRemove(event);
    });
    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockEditor.handle.flush).toHaveBeenCalled();
    expect(mockNavigation.dispatch).not.toHaveBeenCalled();

    await act(async () => {
      await mockEditor.props!.onPending(false);
    });
    expect(mockNavigation.dispatch).toHaveBeenCalledWith({ type: 'GO_BACK' });
  });

  it('leaving with nothing waiting goes at once', async () => {
    await renderEditor();

    const event = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };
    await act(async () => {
      mockNavigation.listeners.beforeRemove(event);
    });

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(mockEditor.handle.flush).not.toHaveBeenCalled();
  });

  it('a new title is saved when the field is left, and reaches the store', async () => {
    const store = await renderEditor();

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('editor-title'), 'Heaps and Tries');
    });
    await act(async () => {
      fireEvent(screen.getByTestId('editor-title'), 'endEditing');
    });

    expect(patches).toEqual([{ url: '/notebook/pages/ds', body: { title: 'Heaps and Tries' } }]);
    expect(store.getState().notebook.pages.ds.title).toBe('Heaps and Tries');
  });
});
