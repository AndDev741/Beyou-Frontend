/**
 * A board read as a path on a phone: levels in study order, "in any order" over a level with
 * more than one node, and every row opening its page.
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

describe('PathView', () => {
  it('lists nodes in study order and opens the page a row stands for', async () => {
    const onOpen = jest.fn();
    await act(async () => {
      render(
        <BeyouThemeProvider>
          <PathView board={board} onOpen={onOpen} />
        </BeyouThemeProvider>,
      );
    });

    const rows = screen.getAllByTestId('notebook-path-row');
    expect(rows).toHaveLength(4);
    expect(screen.getByTestId('notebook-status-DONE')).toBeTruthy();
    expect(screen.getByTestId('notebook-status-STUDYING')).toBeTruthy();

    await act(async () => {
      fireEvent.press(rows[0]);
    });
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ pageId: 'page-Basics' }));
  });
});
