import type { ReactNode } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { BOARD_BLOCK_TYPE } from '@beyou/types/notebook/notebook';
import { useBeyouTheme } from '../theme/ThemeProvider';
import Chip from '../ui/Chip';

/**
 * A page's BlockNote document, drawn with native views.
 *
 * Mobile v1 reads notes and does not edit them, so this is a renderer and nothing else: no
 * editor, no WebView. It knows the blocks the web editor writes (paragraphs, headings, the three
 * list kinds, quotes, code, tables) and the two blocks the notebook adds. The roadmap board is
 * left out here because the screen's Path tab is where a board is read on a phone, and the
 * flashcards block becomes a chip with the page's card count.
 *
 * A block type this file does not know still shows whatever text it carries, so a block added to
 * the editor later degrades to plain text rather than vanishing.
 */

export type InlineStyles = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
};

export type InlineNode =
  | { type: 'text'; text: string; styles?: InlineStyles }
  | { type: 'link'; href: string; content: InlineNode[] | string };

type TableCell = InlineNode[] | { type?: string; content?: InlineNode[] };

export type TableContent = { type: 'tableContent'; rows: { cells: TableCell[] }[] };

export type Block = {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: InlineNode[] | string | TableContent;
  children?: Block[];
};

/**
 * The document as blocks. Null when the JSON does not parse or is not a list of blocks (the
 * screen says the page could not be read); an empty list for a page nobody has written in.
 */
export function parseBlocks(json: string | null | undefined): Block[] | null {
  if (json == null || json.trim() === '') return [];
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (block): block is Block => !!block && typeof block === 'object' && typeof (block as Block).type === 'string',
    );
  } catch {
    return null;
  }
}

/** Every piece of text a block's inline content holds, for unknown block types. */
export function inlineText(content: Block['content']): string {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) {
    return (content.rows ?? [])
      .map((row) => (row.cells ?? []).map((cell) => inlineText(cellContent(cell))).join(' | '))
      .join('\n');
  }
  return content
    .map((node) => (node.type === 'link' ? inlineText(node.content) : node.text ?? ''))
    .join('');
}

function cellContent(cell: TableCell): InlineNode[] {
  return Array.isArray(cell) ? cell : cell?.content ?? [];
}

const SAFE_LINK = /^(https?:|mailto:)/i;

type Props = {
  /** The page's document JSON. */
  content: string | null | undefined;
  /** Cards on the page, for the flashcards block's chip. */
  cardsTotal?: number;
  testID?: string;
};

export default function BlockRenderer({ content, cardsTotal = 0, testID = 'notebook-blocks' }: Props) {
  const { t } = useTranslation();
  const blocks = parseBlocks(content);

  if (blocks === null) {
    return (
      <Text className="text-[14px] text-text-3" testID={`${testID}-unreadable`}>
        {t('NotebookMobileNotesUnreadable')}
      </Text>
    );
  }
  if (blocks.filter((b) => b.type !== BOARD_BLOCK_TYPE).length === 0) {
    return (
      <Text className="text-[14px] text-text-3" testID={`${testID}-empty`}>
        {t('NotebookMobileNotesEmpty')}
      </Text>
    );
  }
  return (
    <View testID={testID} className="gap-2.5">
      <BlockList blocks={blocks} cardsTotal={cardsTotal} />
    </View>
  );
}

function BlockList({ blocks, cardsTotal }: { blocks: Block[]; cardsTotal: number }) {
  // Numbered items count within a run of consecutive numbered items, like the editor shows them.
  let number = 0;
  return (
    <>
      {blocks.map((block, index) => {
        number = block.type === 'numberedListItem' ? number + 1 : 0;
        return <BlockView key={block.id ?? index} block={block} number={number} cardsTotal={cardsTotal} />;
      })}
    </>
  );
}

function BlockView({ block, number, cardsTotal }: { block: Block; number: number; cardsTotal: number }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const children = block.children?.length ? (
    <View className="ml-4 mt-1.5 gap-1.5">
      <BlockList blocks={block.children} cardsTotal={cardsTotal} />
    </View>
  ) : null;
  const inline = Array.isArray(block.content) || typeof block.content === 'string'
    ? (block.content as InlineNode[] | string)
    : undefined;

  switch (block.type) {
    case BOARD_BLOCK_TYPE:
      return null;
    case 'flashcards':
      return (
        <View className="flex-row" testID="notebook-block-flashcards">
          <Chip variant="xp">{t('NotebookMobileCardsCount', { count: cardsTotal })}</Chip>
        </View>
      );
    case 'heading': {
      const level = Number(block.props?.level ?? 1);
      const size = level <= 1 ? 'text-[24px] leading-[30px]' : level === 2 ? 'text-[20px] leading-[26px]' : 'text-[17px] leading-[23px]';
      return (
        <View testID={`notebook-block-heading-${level}`}>
          <Text accessibilityRole="header" className={`mt-2 font-semibold text-text ${size}`}>
            <Inline content={inline} />
          </Text>
          {children}
        </View>
      );
    }
    case 'bulletListItem':
    case 'toggleListItem':
      return (
        <View testID="notebook-block-bullet">
          <View className="flex-row gap-2">
            <Text className="text-[16px] leading-[25px] text-text-2">{block.type === 'toggleListItem' ? '▸' : '•'}</Text>
            <Text className="flex-1 text-[16px] leading-[25px] text-text">
              <Inline content={inline} />
            </Text>
          </View>
          {children}
        </View>
      );
    case 'numberedListItem':
      return (
        <View testID="notebook-block-numbered">
          <View className="flex-row gap-2">
            <Text className="font-mono text-[15px] leading-[25px] text-text-2">{`${number}.`}</Text>
            <Text className="flex-1 text-[16px] leading-[25px] text-text">
              <Inline content={inline} />
            </Text>
          </View>
          {children}
        </View>
      );
    case 'checkListItem': {
      const checked = block.props?.checked === true;
      return (
        <View testID={checked ? 'notebook-block-check-done' : 'notebook-block-check-open'}>
          <View
            className="flex-row items-start gap-2.5"
            accessible
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
          >
            <View
              className={`mt-1 h-[18px] w-[18px] items-center justify-center rounded-[5px] border ${
                checked ? 'border-accent bg-accent' : 'border-text-3'
              }`}
            >
              {checked ? <Check size={12} color={theme.onAccent} strokeWidth={3} /> : null}
            </View>
            <Text className={`flex-1 text-[16px] leading-[25px] ${checked ? 'text-text-2 line-through' : 'text-text'}`}>
              <Inline content={inline} />
            </Text>
          </View>
          {children}
        </View>
      );
    }
    case 'quote':
      return (
        <View className="rounded-control bg-surface-2 px-3.5 py-2.5" testID="notebook-block-quote">
          <Text className="text-[15px] italic leading-6 text-text-2">
            <Inline content={inline} />
          </Text>
          {children}
        </View>
      );
    case 'codeBlock':
      return (
        <ScrollView
          horizontal
          className="rounded-control bg-surface-2"
          contentContainerStyle={{ padding: 12 }}
          testID="notebook-block-code"
        >
          <Text className="font-mono text-[12.5px] leading-[19px] text-text">{inlineText(block.content)}</Text>
        </ScrollView>
      );
    case 'table': {
      const table = block.content && !Array.isArray(block.content) && typeof block.content !== 'string'
        ? block.content
        : null;
      if (!table) return null;
      return (
        <ScrollView horizontal testID="notebook-block-table">
          <View className="overflow-hidden rounded-control border border-border">
            {(table.rows ?? []).map((row, r) => (
              <View key={r} className={`flex-row ${r === 0 ? 'bg-surface-2' : 'border-t border-border'}`}>
                {(row.cells ?? []).map((cell, c) => (
                  <View key={c} className="min-w-[96px] px-3 py-2">
                    <Text className={`text-[14px] text-text ${r === 0 ? 'font-semibold' : ''}`}>
                      <Inline content={cellContent(cell)} />
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      );
    }
    case 'paragraph':
    default: {
      const text = inlineText(block.content);
      if (!text && !children) return block.type === 'paragraph' ? <View className="h-2" /> : null;
      return (
        <View testID={block.type === 'paragraph' ? 'notebook-block-paragraph' : 'notebook-block-other'}>
          {text ? (
            <Text className="text-[16px] leading-[25px] text-text">
              <Inline content={inline ?? text} />
            </Text>
          ) : null}
          {children}
        </View>
      );
    }
  }
}

/** Inline text with its styles, as nested Text so it wraps as one paragraph. */
function Inline({ content }: { content: InlineNode[] | string | undefined }): ReactNode {
  if (content == null) return null;
  if (typeof content === 'string') return content;
  return content.map((node, index) => {
    if (node.type === 'link') {
      const href = node.href ?? '';
      return (
        <Text
          key={index}
          className="text-accent underline"
          accessibilityRole="link"
          onPress={SAFE_LINK.test(href) ? () => void Linking.openURL(href) : undefined}
        >
          {inlineText(node.content)}
        </Text>
      );
    }
    const styles = node.styles ?? {};
    const classes = [
      styles.bold ? 'font-semibold' : '',
      styles.italic ? 'italic' : '',
      styles.underline && styles.strike ? 'underline line-through' : styles.underline ? 'underline' : styles.strike ? 'line-through' : '',
      styles.code ? 'font-mono bg-surface-2 text-[14px]' : '',
    ]
      .filter(Boolean)
      .join(' ');
    return classes ? (
      <Text key={index} className={classes}>
        {node.text}
      </Text>
    ) : (
      node.text
    );
  });
}
