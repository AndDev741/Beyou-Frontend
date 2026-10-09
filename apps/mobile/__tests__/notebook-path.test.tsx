/**
 * A board read as a path on a phone: levels in study order, "in any order" over a level with
 * more than one node, every row opening its page, its "⋯" opening the node's actions, and a new
 * node going after the last one as the path reads.
 */
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import type { Board, BoardNode } from '@beyou/types/notebook/notebook';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import PathView from '../src/notebook/PathView';

const node = (id: string, x: number, status: BoardNode['status'] = 'TO_STUDY'): BoardNode => ({
  id, kind: 'PAGE', pageId: `page-${id}`, title: id, icon: null, status, progress: { done: 1, total: 4 },
  hasBoard: false, x, y: 0, width: null, height: null, linked: false, homeTopicTitle: null,
});

const board: Board = {
  pageId: 'topic',
  nodes: [node('Basics', 0, 'DONE'), node('Structures', 240, 'STUDYING'), node('Systems', 240), node('Design', 480)],
  edges: [
    { id: '1', source: 'Basics', target: 'Structures' },
    { id: '2', source: 'Basics', target: 'Systems' },
    { id: '3', source: 'Structures', target: 'Design' },
  ],
};

const handlers = () => ({ onOpen: jest.fn(), onActions: jest.fn(), onAdd: jest.fn(), onReorder: jest.fn() });

async function renderPath(props: ReturnType<typeof handlers>) {
  await act(async () => {
    render(
      <BeyouThemeProvider>
        <PathView board={board} {...props} />
      </BeyouThemeProvider>,
    );
  });
}

describe('PathView', () => {
  it('lists nodes in study order and opens the page a row stands for', async () => {
    const props = handlers();
    const { onOpen } = props;
    await renderPath(props);

    const rows = screen.getAllByTestId('notebook-path-row');
    expect(rows).toHaveLength(4);
    expect(screen.getByTestId('notebook-status-DONE')).toBeTruthy();
    expect(screen.getByTestId('notebook-status-STUDYING')).toBeTruthy();

    await act(async () => {
      fireEvent.press(rows[0]);
    });
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ pageId: 'page-Basics' }));
  });

  it("opens a node's actions from its row, adds after the end of the path, and offers a reorder", async () => {
    const props = handlers();
    await renderPath(props);

    await act(async () => {
      fireEvent.press(screen.getAllByTestId('notebook-path-actions')[1]);
    });
    expect(props.onActions).toHaveBeenCalledWith(expect.objectContaining({ id: 'Structures' }));

    await act(async () => {
      fireEvent.press(screen.getByTestId('notebook-path-add'));
    });
    // Design comes last: it waits on Structures, which waits on Basics.
    expect(props.onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 'Design' }));

    await act(async () => {
      fireEvent.press(screen.getByTestId('notebook-path-reorder'));
    });
    expect(props.onReorder).toHaveBeenCalled();
  });
});
