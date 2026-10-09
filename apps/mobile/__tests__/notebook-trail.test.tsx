/**
 * Editing a roadmap from the phone: a node added after another, the path saved in a new order,
 * and a node's sheet (rename, links in and out, off the roadmap, deleted with its page). Each goes
 * through the endpoint the web uses and lands in the store.
 * Boundary mocked = @beyou/api HttpClient + notify.
 */
jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import { enterBoard } from '@beyou/state';
import type { Board, BoardNode } from '@beyou/types/notebook/notebook';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import NodeSheet from '../src/notebook/trail/NodeSheet';
import { AddNodeSheet, ReorderSheet } from '../src/notebook/trail/TrailSheets';

const node = (id: string, x: number, linked = false): BoardNode => ({
  id, kind: 'PAGE', pageId: `page-${id}`, title: id, icon: null, status: 'TO_STUDY', progress: null,
  hasBoard: false, x, y: 0, width: null, height: null, linked, homeTopicTitle: null,
});

const board: Board = {
  pageId: 'topic',
  nodes: [node('Physical', 40), node('Link', 280), node('Network', 520)],
  edges: [{ id: 'e1', source: 'Physical', target: 'Link' }],
};

let calls: { method: string; url: string; body?: any; params?: any }[] = [];

beforeEach(() => {
  calls = [];
  setLogger({ error: () => {} });
  setHttpClient({
    get: async () => ({ data: board, headers: {} }),
    post: async (url: string, body: any) => {
      calls.push({ method: 'POST', url, body });
      if (url.endsWith('/edges')) return { data: { id: 'e2', source: body.source, target: body.target }, headers: {} };
      return { data: { node: node('Transport', 760), changed: [], refreshUi: null }, headers: {} };
    },
    put: async (url: string, body: any) => {
      calls.push({ method: 'PUT', url, body });
      const ordered = body.order.map((id: string) => board.nodes.find((n) => n.id === id));
      return { data: { ...board, nodes: ordered, edges: [] }, headers: {} };
    },
    patch: async (url: string, body: any) => {
      calls.push({ method: 'PATCH', url, body });
      return { data: { id: 'page-Link', title: body.title ?? 'Link', icon: body.icon ?? null }, headers: {} };
    },
    delete: async (url: string, config?: any) => {
      calls.push({ method: 'DELETE', url, params: config?.params });
      return { data: { node: null, changed: [], refreshUi: null }, headers: {} };
    },
  } as never);
});

function withStore(children: React.ReactNode) {
  const store = makeStore();
  store.dispatch(enterBoard(board));
  return {
    store,
    ui: (
      <Provider store={store}>
        <BeyouThemeProvider>{children}</BeyouThemeProvider>
      </Provider>
    ),
  };
}

const press = async (testID: string, index = 0) => {
  await act(async () => {
    fireEvent.press(screen.getAllByTestId(testID)[index]);
  });
};

describe('AddNodeSheet', () => {
  it('adds a node after the one named, with no coordinates for the server to pick', async () => {
    const onAdded = jest.fn();
    const { ui } = withStore(
      <AddNodeSheet boardPageId="topic" after={node('Network', 520)} visible onClose={() => {}} onAdded={onAdded} />,
    );
    await act(async () => {
      render(ui);
    });

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('add-node-title'), ' Transport ');
    });
    await press('add-node-submit');

    expect(calls).toEqual([{ method: 'POST', url: '/notebook/pages/topic/board/nodes', body: { title: 'Transport', after: 'Network' } }]);
    expect(onAdded).toHaveBeenCalled();
  });
});

describe('ReorderSheet', () => {
  it('moves a node with the arrows and saves the whole path in that order', async () => {
    const { store, ui } = withStore(<ReorderSheet board={board} visible onClose={() => {}} />);
    await act(async () => {
      render(ui);
    });

    // The path reads Physical, Network (no edge in: first level, left to right), then Link.
    await press('reorder-up', 2);
    await press('reorder-save');

    expect(calls).toEqual([{ method: 'PUT', url: '/notebook/pages/topic/board/order', body: { order: ['Physical', 'Link', 'Network'] } }]);
    expect(store.getState().notebook.boards.topic.edges).toEqual([]);
  });
});

describe('NodeSheet', () => {
  async function renderSheet(target: BoardNode) {
    const onChanged = jest.fn();
    const { store, ui } = withStore(
      <NodeSheet board={board} node={target} onClose={() => {}} onChanged={onChanged} onOpen={() => {}} onAddAfter={() => {}} />,
    );
    await act(async () => {
      render(ui);
    });
    return { store, onChanged };
  }

  it("renames the node's page when the title is left", async () => {
    const { store } = await renderSheet(node('Link', 280));

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('node-title'), 'Data link');
    });
    await act(async () => {
      fireEvent(screen.getByTestId('node-title'), 'endEditing');
    });

    expect(calls).toEqual([{ method: 'PATCH', url: '/notebook/pages/page-Link', body: { title: 'Data link' } }]);
    expect(store.getState().notebook.boards.topic.nodes.find((n: BoardNode) => n.id === 'Link')?.title).toBe('Data link');
  });

  it('unlinks a node it comes after, and links another', async () => {
    const { store } = await renderSheet(node('Link', 280));

    await press('node-unlink');
    expect(calls).toEqual([{ method: 'DELETE', url: '/notebook/board/edges/e1', params: undefined }]);
    expect(store.getState().notebook.boards.topic.edges).toEqual([]);

    // The choices are the nodes it does not come after yet; the board here is the one passed in.
    await press('node-link');
    expect(screen.getAllByTestId('node-link-choice')).toHaveLength(1);
    await press('node-link-choice');
    expect(calls[1]).toEqual({ method: 'POST', url: '/notebook/pages/topic/board/edges', body: { source: 'Network', target: 'Link' } });
    expect(store.getState().notebook.boards.topic.edges).toEqual([{ id: 'e2', source: 'Network', target: 'Link' }]);
  });

  it('takes the node off the roadmap and keeps its page', async () => {
    const { onChanged } = await renderSheet(node('Link', 280));

    await press('node-remove');

    expect(calls).toEqual([{ method: 'DELETE', url: '/notebook/board/nodes/Link', params: { deletePage: false } }]);
    expect(onChanged).toHaveBeenCalled();
  });

  it('deletes the page only after the dialog, and offers no delete for a linked page', async () => {
    const { store } = await renderSheet(node('Link', 280));

    await press('node-delete');
    expect(calls).toEqual([]);
    await press('node-delete-modal-confirm');

    expect(calls).toEqual([{ method: 'DELETE', url: '/notebook/board/nodes/Link', params: { deletePage: true } }]);
    expect(store.getState().notebook.boards.topic.nodes.map((n: BoardNode) => n.id)).not.toContain('Link');
  });

  it('a linked node only comes off', async () => {
    await renderSheet(node('Network', 520, true));

    expect(screen.queryByTestId('node-delete')).toBeNull();
    expect(screen.getByTestId('node-remove')).toBeTruthy();
  });
});
