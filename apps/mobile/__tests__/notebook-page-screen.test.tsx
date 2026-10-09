/**
 * A notebook page on a phone: it loads the page and its board, reads the board as a path, and a
 * status change from the picker reaches the server and every place the store shows the page.
 * Boundary mocked = @beyou/api HttpClient + expo-router + notify.
 */
jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(() => callback(), [callback]),
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({ id: 'ds' }),
}));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import { notify } from '../src/notify';
import NotebookPageScreen from '../app/(app)/notebook/[id]';

const page = {
  id: 'ds', kind: 'PAGE', topicId: 'se', parentId: 'se', title: 'Data Structures', icon: null, description: null,
  content: JSON.stringify([{ type: 'paragraph', content: [{ type: 'text', text: 'Notes here', styles: {} }] }]),
  status: 'STUDYING', statusManual: false, hasBoard: true, progress: { done: 1, total: 2 },
  breadcrumb: [{ id: 'se', title: 'Software Engineering', icon: null }, { id: 'ds', title: 'Data Structures', icon: null }],
  goal: null, category: null, habit: null, focusMinutes: 50, cardsTotal: 3, cardsDue: 2, sourcesCount: 0,
  updatedAt: '2026-10-04T00:00:00Z',
};

const node = (id: string, status: string, x: number) => ({
  id, kind: 'PAGE', pageId: `p-${id}`, title: id, icon: null, status, progress: { done: 0, total: 1 }, hasBoard: false,
  x, y: 0, width: null, height: null, linked: false, homeTopicTitle: null,
});

const board = { pageId: 'ds', nodes: [node('Arrays', 'DONE', 0), node('Trees', 'STUDYING', 240)], edges: [] };

const treeItem = (id: string, title: string, onBoard: boolean) => ({
  id, parentId: 'ds', title, icon: null, status: 'TO_STUDY', onBoard, linked: false, progress: { done: 0, total: 1 }, position: 0,
});
const tree = {
  topic: { id: 'se', title: 'Software Engineering', icon: null },
  items: [treeItem('p-Trees', 'Trees', true), treeItem('cheat', 'Cheat sheet', false)],
  sourcesCount: 0,
  cardsDue: 0,
};

let puts: { url: string; body: unknown }[] = [];

beforeEach(() => {
  puts = [];
  setLogger({ error: () => {} });
  setHttpClient({
    get: async (url: string) => ({ data: url.endsWith('/board') ? board : url.endsWith('/tree') ? tree : page, headers: {} }),
    post: async () => ({ data: {}, headers: {} }),
    put: async (url: string, body: unknown) => {
      puts.push({ url, body });
      return {
        data: {
          pageId: 'ds', status: 'DONE', statusManual: true,
          changed: [{ pageId: 'ds', status: 'DONE' }], xpEarned: 15, refreshUi: null,
        },
        headers: {},
      };
    },
    patch: async () => ({ data: {}, headers: {} }),
    delete: async () => ({ data: {}, headers: {} }),
  } as never);
});

async function renderPage(store = makeStore()) {
  await act(async () => {
    render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <NotebookPageScreen />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
  return store;
}

describe('NotebookPageScreen', () => {
  it('opens on the path when the page has a board, and a row opens its page', async () => {
    await renderPage();

    await waitFor(() => expect(screen.getByTestId('notebook-page-title')).toBeTruthy());
    expect(screen.getAllByTestId('notebook-path-row')).toHaveLength(2);

    await act(async () => {
      fireEvent.press(screen.getAllByTestId('notebook-path-row')[1]);
    });
    expect(mockPush).toHaveBeenCalledWith('/notebook/p-Trees');
  });

  it('a status picked here is sent and written into the store', async () => {
    const store = await renderPage();
    await waitFor(() => expect(screen.getByTestId('notebook-page-status-DONE')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('notebook-page-status-DONE'));
    });

    expect(puts).toEqual([{ url: '/notebook/pages/ds/status', body: { status: 'DONE' } }]);
    expect(store.getState().notebook.pages.ds.status).toBe('DONE');
    expect(store.getState().notebook.pages.ds.statusManual).toBe(true);
    expect(notify.success).toHaveBeenCalled();
  });

  it('lists the pages under this one that are not on its board, and opens one', async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByTestId('notebook-page-subpages')).toBeTruthy());

    // Trees is on the board, so the path shows it; only the page off the board is listed.
    expect(screen.getAllByTestId('notebook-subpage')).toHaveLength(1);
    await act(async () => {
      fireEvent.press(screen.getByText('Cheat sheet'));
    });
    expect(mockPush).toHaveBeenCalledWith('/notebook/cheat');
  });

  it('the notes tab draws the document', async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByTestId('notebook-page-tab-notes')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('notebook-page-tab-notes'));
    });

    expect(screen.getByText('Notes here')).toBeTruthy();
  });
});
