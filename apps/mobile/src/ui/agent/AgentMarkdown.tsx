import { Text, View, Linking } from 'react-native';

/**
 * Minimal markdown renderer for agent replies. The system prompt restricts
 * the model to bold, lists, inline code and links — a ~90-line parser covers
 * that without pulling a react-native markdown dependency of uncertain
 * RN 0.85 / React 19 compatibility.
 */

type Segment =
  | { kind: 'plain'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'link'; text: string; href: string };

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^)]+)\))/g;
const LINK = /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/;

export function parseInline(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) segments.push({ kind: 'plain', text: text.slice(last, index) });
    const token = match[0];
    if (token.startsWith('**')) {
      segments.push({ kind: 'bold', text: token.slice(2, -2) });
    } else if (token.startsWith('`')) {
      segments.push({ kind: 'code', text: token.slice(1, -1) });
    } else {
      const link = LINK.exec(token);
      if (link) segments.push({ kind: 'link', text: link[1], href: link[2] });
    }
    last = index + token.length;
  }
  if (last < text.length) segments.push({ kind: 'plain', text: text.slice(last) });
  return segments;
}

type Block =
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'table'; header: string[]; rows: string[][] };

const TABLE_ROW = /^\s*\|(.+)\|\s*$/;
const TABLE_SEPARATOR = /^\s*\|?[\s:|-]+\|?\s*$/;

function splitCells(line: string): string[] {
  return (TABLE_ROW.exec(line)?.[1] ?? '').split('|').map((cell) => cell.trim());
}

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let table: { header: string[]; rows: string[][] } | null = null;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ kind: 'paragraph', text: paragraph.join('\n') });
    paragraph = [];
  };
  const flushList = () => {
    if (list) blocks.push({ kind: 'list', ...list });
    list = null;
  };
  const flushTable = () => {
    if (table) blocks.push({ kind: 'table', ...table });
    table = null;
  };

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (TABLE_ROW.test(line)) {
      flushParagraph();
      flushList();
      if (TABLE_SEPARATOR.test(line)) continue; // |---|---| divider row
      if (!table) table = { header: splitCells(line), rows: [] };
      else table.rows.push(splitCells(line));
    } else if (bullet || numbered) {
      flushParagraph();
      flushTable();
      const ordered = !!numbered;
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? numbered)![1]);
    } else if (line.trim() === '') {
      flushParagraph();
      flushList();
      flushTable();
    } else {
      flushList();
      flushTable();
      // Strip heading/blockquote markers the prompt forbids anyway.
      paragraph.push(line.replace(/^#{1,6}\s+|^>\s+/, ''));
    }
  }
  flushParagraph();
  flushList();
  flushTable();
  return blocks;
}

function InlineText({ text, small = false }: { text: string; small?: boolean }) {
  return (
    <Text className={small ? 'text-[13px] leading-[19px] text-secondary' : 'text-[15px] leading-[22px] text-secondary'}>
      {parseInline(text).map((segment, i) => {
        if (segment.kind === 'bold')
          return (
            <Text key={i} className="font-semibold">
              {segment.text}
            </Text>
          );
        if (segment.kind === 'code')
          return (
            <Text key={i} className="rounded bg-primary/10 font-mono text-[13px]">
              {` ${segment.text} `}
            </Text>
          );
        if (segment.kind === 'link')
          return (
            <Text
              key={i}
              className="text-primary underline"
              onPress={() => Linking.openURL(segment.href)}
            >
              {segment.text}
            </Text>
          );
        return <Text key={i}>{segment.text}</Text>;
      })}
    </Text>
  );
}

/**
 * Plain-View table: no nested horizontal ScrollView — inside the thread's
 * vertical ScrollView it inflates without an explicit height (RN quirk).
 * Cells flex evenly and wrap their text; cell content goes through the
 * inline parser so **bold** etc. render instead of showing markers.
 */
function TableBlock({ header, rows }: { header: string[]; rows: string[][] }) {
  const cellClass = (col: number) => `flex-1 px-2 py-1.5 ${col > 0 ? 'border-l border-primary/15' : ''}`;
  return (
    <View className="overflow-hidden rounded-lg border border-primary/15">
      <View className="flex-row bg-primary/10">
        {header.map((cell, i) => (
          <View key={i} className={cellClass(i)}>
            <Text className="text-[13px] font-semibold text-secondary">
              {parseInline(cell).map((s, j) => (
                <Text key={j}>{s.text}</Text>
              ))}
            </Text>
          </View>
        ))}
      </View>
      {rows.map((row, r) => (
        <View key={r} className="flex-row border-t border-primary/15">
          {header.map((_, c) => (
            <View key={c} className={cellClass(c)}>
              <InlineText text={row[c] ?? ''} small />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export default function AgentMarkdown({ text }: { text: string }) {
  return (
    <View className="gap-2">
      {parseBlocks(text).map((block, i) => {
        if (block.kind === 'paragraph') return <InlineText key={i} text={block.text} />;
        if (block.kind === 'table') return <TableBlock key={i} header={block.header} rows={block.rows} />;
        return (
          <View key={i} className="gap-1">
            {block.items.map((item, j) => (
              <View key={j} className="flex-row">
                <Text className="w-5 text-[15px] leading-[22px] text-description">
                  {block.ordered ? `${j + 1}.` : '•'}
                </Text>
                <View className="flex-1">
                  <InlineText text={item} />
                </View>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}
