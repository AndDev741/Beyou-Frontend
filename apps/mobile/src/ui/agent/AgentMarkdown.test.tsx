import React from 'react';
import { render } from '@testing-library/react-native';
import AgentMarkdown, { parseBlocks, parseInline } from './AgentMarkdown';
import { BeyouThemeProvider } from '../../theme/ThemeProvider';

describe('parseInline', () => {
  it('splits bold, code and plain segments', () => {
    expect(parseInline('a **b** and `c` d')).toEqual([
      { kind: 'plain', text: 'a ' },
      { kind: 'bold', text: 'b' },
      { kind: 'plain', text: ' and ' },
      { kind: 'code', text: 'c' },
      { kind: 'plain', text: ' d' },
    ]);
  });

  it('parses italics without leaking asterisks', () => {
    expect(parseInline('done *(nível 5!)* ok')).toEqual([
      { kind: 'plain', text: 'done ' },
      { kind: 'italic', text: '(nível 5!)' },
      { kind: 'plain', text: ' ok' },
    ]);
  });

  it('parses http links and ignores non-http schemes', () => {
    expect(parseInline('[site](https://a.com)')).toEqual([
      { kind: 'link', text: 'site', href: 'https://a.com' },
    ]);
    expect(parseInline('[x](javascript:alert(1))')).toEqual([
      { kind: 'plain', text: '[x](javascript:alert(1))' },
    ]);
  });

  it('parses internal app paths as links', () => {
    expect(parseInline('go to [your routines](/routines)!')).toEqual([
      { kind: 'plain', text: 'go to ' },
      { kind: 'link', text: 'your routines', href: '/routines' },
      { kind: 'plain', text: '!' },
    ]);
  });
});

describe('parseBlocks', () => {
  it('groups bullets into a list and separates paragraphs', () => {
    expect(parseBlocks('intro\n\n- one\n- two\n\noutro')).toEqual([
      { kind: 'paragraph', text: 'intro' },
      { kind: 'list', ordered: false, items: [{ text: 'one' }, { text: 'two' }] },
      { kind: 'paragraph', text: 'outro' },
    ]);
  });

  it('parses ordered lists and strips heading markers', () => {
    expect(parseBlocks('# Title\n1. a\n2. b')).toEqual([
      { kind: 'paragraph', text: 'Title' },
      { kind: 'list', ordered: true, items: [{ text: 'a', number: 1 }, { text: 'b', number: 2 }] },
    ]);
  });

  it('keeps the source numbering instead of restarting at 1', () => {
    const blocks = parseBlocks('7. seventh\n8. eighth');
    expect(blocks).toEqual([
      { kind: 'list', ordered: true, items: [{ text: 'seventh', number: 7 }, { text: 'eighth', number: 8 }] },
    ]);
  });

  it('treats a wrapped line as continuation of the previous list item', () => {
    expect(parseBlocks('1. Preparar marmita\n(nível 5!)\n2. Meditar')).toEqual([
      {
        kind: 'list',
        ordered: true,
        items: [
          { text: 'Preparar marmita (nível 5!)', number: 1 },
          { text: 'Meditar', number: 2 },
        ],
      },
    ]);
  });

  it('parses a GFM table with separator row', () => {
    expect(parseBlocks('| Habit | Level |\n|---|---|\n| Read | 3 |\n| Gym | 1 |')).toEqual([
      {
        kind: 'table',
        header: ['Habit', 'Level'],
        rows: [
          ['Read', '3'],
          ['Gym', '1'],
        ],
      },
    ]);
  });

  it('separates tables from surrounding paragraphs', () => {
    const blocks = parseBlocks('Your habits:\n| A | B |\n|---|---|\n| 1 | 2 |\nDone!');
    expect(blocks.map((b) => b.kind)).toEqual(['paragraph', 'table', 'paragraph']);
  });
});

describe('AgentMarkdown', () => {
  it('renders bold and list item text', async () => {
    const { getByText } = await render(
      <BeyouThemeProvider>
        <AgentMarkdown text={'Done! **Read** created\n- daily at 08:00'} />
      </BeyouThemeProvider>,
    );
    expect(getByText('Read')).toBeTruthy();
    expect(getByText('daily at 08:00')).toBeTruthy();
  });

  it('renders table header and cells', async () => {
    const { getByText } = await render(
      <BeyouThemeProvider>
        <AgentMarkdown text={'| Habit | Level |\n|---|---|\n| Read | 3 |'} />
      </BeyouThemeProvider>,
    );
    expect(getByText('Habit')).toBeTruthy();
    expect(getByText('Read')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
  });

  it('fires onInternalLink when an internal link is pressed', async () => {
    const onInternalLink = jest.fn();
    const { getByText } = await render(
      <BeyouThemeProvider>
        <AgentMarkdown text={'See [your routines](/routines)'} onInternalLink={onInternalLink} />
      </BeyouThemeProvider>,
    );
    const { fireEvent } = require('@testing-library/react-native');
    fireEvent.press(getByText('your routines'));
    expect(onInternalLink).toHaveBeenCalledWith('/routines');
  });

  it('parses inline markdown inside table cells instead of showing markers', async () => {
    const { getByText, queryByText } = await render(
      <BeyouThemeProvider>
        <AgentMarkdown text={'| Categoria | Nível |\n|---|---|\n| **Saúde Física** | 2 |'} />
      </BeyouThemeProvider>,
    );
    expect(getByText('Saúde Física')).toBeTruthy();
    expect(queryByText('**Saúde Física**')).toBeNull();
  });
});
