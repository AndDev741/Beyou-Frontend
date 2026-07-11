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

  it('parses http links and ignores non-http schemes', () => {
    expect(parseInline('[site](https://a.com)')).toEqual([
      { kind: 'link', text: 'site', href: 'https://a.com' },
    ]);
    expect(parseInline('[x](javascript:alert(1))')).toEqual([
      { kind: 'plain', text: '[x](javascript:alert(1))' },
    ]);
  });
});

describe('parseBlocks', () => {
  it('groups bullets into a list and separates paragraphs', () => {
    expect(parseBlocks('intro\n\n- one\n- two\n\noutro')).toEqual([
      { kind: 'paragraph', text: 'intro' },
      { kind: 'list', ordered: false, items: ['one', 'two'] },
      { kind: 'paragraph', text: 'outro' },
    ]);
  });

  it('parses ordered lists and strips heading markers', () => {
    expect(parseBlocks('# Title\n1. a\n2. b')).toEqual([
      { kind: 'paragraph', text: 'Title' },
      { kind: 'list', ordered: true, items: ['a', 'b'] },
    ]);
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
});
