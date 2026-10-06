/**
 * The native reader for a page's BlockNote document. Read only on mobile v1, so what matters is
 * that every block the web editor writes shows up, the board block does not (the Path tab is
 * where a phone reads a board), and a broken document says so instead of crashing the screen.
 */
import { render, screen, act } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import BlockRenderer, { inlineText, parseBlocks } from '../src/notebook/BlockRenderer';

const text = (value: string, styles = {}) => ({ type: 'text', text: value, styles });

const doc = JSON.stringify([
  { type: 'heading', props: { level: 2 }, content: [text('BST deletion')] },
  { type: 'paragraph', content: [text('Use the '), text('successor', { bold: true }), text('.')] },
  { type: 'bulletListItem', content: [text('No children')], children: [{ type: 'bulletListItem', content: [text('Nested')] }] },
  { type: 'numberedListItem', content: [text('First')] },
  { type: 'numberedListItem', content: [text('Second')] },
  { type: 'checkListItem', props: { checked: true }, content: [text('Read chapter 12')] },
  { type: 'checkListItem', props: { checked: false }, content: [text('Do the quiz')] },
  { type: 'codeBlock', props: { language: 'java' }, content: [text('Node succ = min(root.right);')] },
  { type: 'roadmapBoard', props: {} },
  { type: 'flashcards', props: {} },
]);

async function renderBlocks(content: string | null, cardsTotal = 0) {
  await act(async () => {
    render(
      <BeyouThemeProvider>
        <BlockRenderer content={content} cardsTotal={cardsTotal} />
      </BeyouThemeProvider>,
    );
  });
}

describe('BlockRenderer', () => {
  it('draws headings, paragraphs, lists, check items and code', async () => {
    await renderBlocks(doc, 7);

    expect(screen.getByTestId('notebook-block-heading-2')).toBeTruthy();
    expect(screen.getByText('BST deletion')).toBeTruthy();
    expect(screen.getByText('successor')).toBeTruthy();
    expect(screen.getAllByTestId('notebook-block-bullet')).toHaveLength(2);
    expect(screen.getByText('Nested')).toBeTruthy();
    // Numbered items count within their run.
    expect(screen.getByText('1.')).toBeTruthy();
    expect(screen.getByText('2.')).toBeTruthy();
    expect(screen.getByTestId('notebook-block-check-done')).toBeTruthy();
    expect(screen.getByTestId('notebook-block-check-open')).toBeTruthy();
    expect(screen.getByText('Node succ = min(root.right);')).toBeTruthy();
    expect(screen.getByTestId('notebook-block-flashcards')).toBeTruthy();
  });

  it('leaves the roadmap board to the Path tab', async () => {
    await renderBlocks(JSON.stringify([{ type: 'roadmapBoard', props: {} }]));

    // A page that is only a board has no notes to show here.
    expect(screen.getByTestId('notebook-blocks-empty')).toBeTruthy();
  });

  it('says so when the document cannot be read', async () => {
    await renderBlocks('{not json');

    expect(screen.getByTestId('notebook-blocks-unreadable')).toBeTruthy();
  });

  it('shows the text of a block type it does not know', async () => {
    await renderBlocks(JSON.stringify([{ type: 'callout', content: [text('A future block')] }]));

    expect(screen.getByText('A future block')).toBeTruthy();
  });
});

describe('parseBlocks / inlineText', () => {
  it('is empty for a page nobody has written in and null for broken JSON', () => {
    expect(parseBlocks(null)).toEqual([]);
    expect(parseBlocks('')).toEqual([]);
    expect(parseBlocks('{"type":"paragraph"}')).toBeNull();
    expect(parseBlocks('nope')).toBeNull();
  });

  it('reads links and table cells as text', () => {
    expect(inlineText([{ type: 'link', href: 'https://x', content: [{ type: 'text', text: 'a link' }] }])).toBe('a link');
    expect(
      inlineText({ type: 'tableContent', rows: [{ cells: [[{ type: 'text', text: 'Array' }], [{ type: 'text', text: 'O(1)' }]] }] }),
    ).toBe('Array | O(1)');
  });
});
