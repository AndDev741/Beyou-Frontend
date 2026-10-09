/**
 * Writing the notebook's structure from the phone: a topic from the home, and rename, icon, a new
 * page under this one and delete from a page's "⋯". Each goes through the same endpoint the web
 * uses and lands in the store, so the screens behind show it without a reload.
 * Boundary mocked = @beyou/api HttpClient + expo-router + notify.
 */
jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import { enterNotebookPage } from '@beyou/state';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import PageActions from '../src/notebook/PageActions';
import NewTopicSheet from '../src/notebook/NewTopicSheet';

const page = {
  id: 'ds', kind: 'PAGE', topicId: 'se', parentId: 'se', title: 'Data Structures', icon: null, description: null,
  content: null, contentRevision: 0,
  status: 'TO_STUDY', statusManual: false, hasBoard: false, progress: { done: 0, total: 1 },
  breadcrumb: [{ id: 'se', title: 'Software Engineering', icon: null }, { id: 'ds', title: 'Data Structures', icon: null }],
  goal: null, category: null, habit: null, focusMinutes: 0, cardsTotal: 0, cardsDue: 0, sourcesCount: 0,
  updatedAt: '2026-10-09T00:00:00Z',
};

let calls: { method: string; url: string; body?: any }[] = [];

beforeEach(() => {
  calls = [];
  jest.clearAllMocks();
  setLogger({ error: () => {} });
  setHttpClient({
    get: async (url: string) => ({ data: page, headers: {} }),
    post: async (url: string, body: any) => {
      calls.push({ method: 'POST', url, body });
      return { data: { ...page, id: url === '/notebook/topics' ? 'new-topic' : 'new-page', parentId: body.parentId ?? null, title: body.title }, headers: {} };
    },
    put: async () => ({ data: {}, headers: {} }),
    patch: async (url: string, body: any) => {
      calls.push({ method: 'PATCH', url, body });
      return { data: { ...page, ...body, icon: body.icon === '' ? null : body.icon ?? page.icon }, headers: {} };
    },
    delete: async (url: string) => {
      calls.push({ method: 'DELETE', url });
      return { data: undefined, headers: {} };
    },
  } as never);
});

async function renderActions() {
  const store = makeStore();
  store.dispatch(enterNotebookPage(page as never));
  await act(async () => {
    render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <PageActions page={page as never} open onClose={() => {}} />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
  return store;
}

const press = async (testID: string) => {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
};

describe('PageActions', () => {
  it('renames the page and writes the new title into the store', async () => {
    const store = await renderActions();

    await press('page-action-rename');
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('page-rename-input'), 'Heaps');
    });
    await press('page-rename-save');

    expect(calls).toEqual([{ method: 'PATCH', url: '/notebook/pages/ds', body: { title: 'Heaps' } }]);
    expect(store.getState().notebook.pages.ds.title).toBe('Heaps');
  });

  it('adds a page under this one and opens it in the editor', async () => {
    const store = await renderActions();

    await press('page-action-add');

    expect(calls).toEqual([{ method: 'POST', url: '/notebook/pages', body: { parentId: 'ds', title: 'Untitled' } }]);
    expect(store.getState().notebook.pages['new-page']).toBeTruthy();
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/notebook-editor', params: { id: 'new-page' } });
  });

  it('deletes only after the dialog is confirmed, then leaves the page it deleted', async () => {
    const store = await renderActions();

    await press('page-action-delete');
    expect(calls).toEqual([]);
    expect(screen.getByTestId('page-delete')).toBeTruthy();

    await press('page-delete-confirm');

    expect(calls).toEqual([{ method: 'DELETE', url: '/notebook/pages/ds' }]);
    expect(store.getState().notebook.pages.ds).toBeUndefined();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/notebook/se');
  });
});

describe('NewTopicSheet', () => {
  it('creates a topic from its title and opens it', async () => {
    const store = makeStore();
    await act(async () => {
      render(
        <Provider store={store}>
          <BeyouThemeProvider>
            <NewTopicSheet visible onClose={() => {}} />
          </BeyouThemeProvider>
        </Provider>,
      );
    });

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('new-topic-title'), '  Spanish B1 ');
    });
    await press('new-topic-submit');

    expect(calls).toEqual([{ method: 'POST', url: '/notebook/topics', body: { title: 'Spanish B1' } }]);
    expect(store.getState().notebook.pages['new-topic']).toBeTruthy();
    expect(mockRouter.push).toHaveBeenCalledWith('/notebook/new-topic');
  });
});
