'use dom';

// BlockNote's own sheet reaches the rest through CSS @imports of package names, which the web
// view's bundle does not follow (the lists lost their bullets, the menus their styles). Each
// sheet is imported here instead; Mantine's whole one stands in for the 78 component files
// BlockNote lists, which is harmless in a web view that holds nothing but the editor.
import '@mantine/core/styles.css';
import '@blocknote/core/style.css';
import '@blocknote/react/style.css';
import '@blocknote/mantine/style.css';
import './notebookEditor.css';
import { createContext, useContext, useEffect, useMemo, useRef, type CSSProperties, type Ref } from 'react';
import { BlockNoteSchema, createCodeBlockSpec, defaultBlockSpecs } from '@blocknote/core';
import { en as bnEn, pt as bnPt } from '@blocknote/core/locales';
import { createReactBlockSpec, useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView, type Theme as EditorTheme } from '@blocknote/mantine';
import { useDOMImperativeHandle, type DOMProps } from 'expo/dom';
import { BOARD_BLOCK_TYPE } from '@beyou/types/notebook/notebook';
import { CODE_LANGUAGES, hasUnknownLanguage, normalizeCodeLanguage } from '@beyou/state/notebook/codeLanguages';
import { documentPatch, hasBlockWithoutId, initialBlocks } from '@beyou/state/notebook/editorDocument';
import { DocumentSync, type SaveAnswer, type ServerPage, type SyncStatus } from '@beyou/state/notebook/documentSync';
import type { ConflictChoice, DocBlock, MergeResult } from '@beyou/state/notebook/mergeDocuments';
import type {
  BlockChoice,
  EditorCommand,
  EditorFormat,
  EditorPalette,
  EditorStrings,
  NotebookEditorHandle,
} from './editorBridge';

/** Debounce for the autosave, the web editor's: long enough to batch a sentence, short enough to lose nothing. */
const SAVE_DELAY_MS = 900;

type Props = {
  /** The page as the screen read it. Read once: later changes reach the editor through `serverChanged`. */
  content: string | null;
  revision: number;
  cardsTotal: number;
  language: string;
  strings: EditorStrings;
  palette: EditorPalette;
  save: (content: string, baseRevision: number) => Promise<SaveAnswer>;
  fetchPage: () => Promise<ServerPage | null>;
  onStatus: (status: SyncStatus) => Promise<void>;
  onConflict: (result: MergeResult | null) => Promise<void>;
  /** True while an edit has not reached the server: the screen waits on it before it closes. */
  onPending: (pending: boolean) => Promise<void>;
  onFormat: (format: EditorFormat) => Promise<void>;
  openBoard: () => Promise<void>;
  openCards: () => Promise<void>;
  openLink: (url: string) => Promise<void>;
  ref?: Ref<NotebookEditorHandle>;
  dom?: DOMProps;
};

type Embeds = { strings: EditorStrings; cardsTotal: number; openBoard: () => void; openCards: () => void };
const EmbedContext = createContext<Embeds | null>(null);

/**
 * A board or a cards block on the phone: a card that opens where the phone shows them. The block
 * stays in the document exactly as the web editor wrote it; only the drawing differs.
 */
function Embed({ kind }: { kind: 'board' | 'cards' }) {
  const embeds = useContext(EmbedContext);
  if (!embeds) return null;
  const { strings } = embeds;
  const board = kind === 'board';
  return (
    <button
      type="button"
      contentEditable={false}
      className={`nb-embed nb-embed-${kind}`}
      data-testid={board ? 'editor-board' : 'editor-cards'}
      onClick={board ? embeds.openBoard : embeds.openCards}
    >
      <span className="nb-embed-icon" aria-hidden="true">
        {board ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="15" width="6" height="6" rx="1" /><path d="M6 9v3a3 3 0 0 0 3 3h6" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
            <path d="m12 2 9 5-9 5-9-5z" /><path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
          </svg>
        )}
      </span>
      <span className="nb-embed-text">
        <span className="nb-embed-title">{board ? strings.board : strings.cards}</span>
        <span className="nb-embed-hint">{board ? strings.boardHint : strings.cardsHint}</span>
      </span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
  );
}

const BoardSpec = createReactBlockSpec(
  { type: BOARD_BLOCK_TYPE, propSchema: {}, content: 'none' },
  { render: function BoardEmbed() { return <Embed kind="board" />; } },
);
const CardsSpec = createReactBlockSpec(
  { type: 'flashcards', propSchema: {}, content: 'none' },
  { render: function CardsEmbed() { return <Embed kind="cards" />; } },
);

// The web editor's schema, block for block, so a page written on either opens on the other:
// audio, video and file left out, a language picker on code blocks, the board and the cards.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { audio, video, file, ...kept } = defaultBlockSpecs;
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...kept,
    codeBlock: createCodeBlockSpec({ supportedLanguages: CODE_LANGUAGES, defaultLanguage: 'text' }),
    [BOARD_BLOCK_TYPE]: BoardSpec(),
    flashcards: CardsSpec(),
  },
});
type Editor = typeof schema.BlockNoteEditor;
type Block = typeof schema.Block;
type PartialBlocks = Parameters<Editor['insertBlocks']>[0];

/**
 * The notes of one page, edited on the phone: BlockNote, as on the web, inside a web view.
 *
 * BlockNote's own menus are off. The side menu needs a hover a finger does not have, and the
 * floating toolbar fights Android's selection handles; the screen draws a toolbar above the
 * keyboard and sends its taps here as commands. Typing "/" still opens the block menu.
 */
export default function NotebookEditorDom(props: Props) {
  const { content, revision, cardsTotal, language, strings, palette, ref } = props;
  // The callbacks are proxies to the native side and change identity on every render there.
  const callbacks = useRef(props);
  callbacks.current = props;

  const initialContent = useMemo(() => initialBlocks(content) as PartialBlocks | undefined, []); // eslint-disable-line react-hooks/exhaustive-deps
  const editor = useCreateBlockNote(
    {
      schema,
      initialContent,
      dictionary: dictionaryFor(language, strings.placeholder),
    },
    [],
  );

  // True only while a merge swaps in what the server already has.
  const silent = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<string | null>(null);
  const inFlight = useRef(0);
  const reported = useRef<boolean | null>(null);

  const reportPending = () => {
    // A tick later: a save that answers starts the queued one on the way out, and that one
    // should keep the flag up rather than drop and raise it.
    setTimeout(() => {
      const pending = timer.current !== null || inFlight.current > 0;
      if (pending !== reported.current) {
        reported.current = pending;
        void callbacks.current.onPending(pending);
      }
    }, 0);
  };

  const sync = useMemo(
    () =>
      new DocumentSync({
        save: async (json, baseRevision) => {
          inFlight.current += 1;
          reportPending();
          try {
            return await callbacks.current.save(json, baseRevision);
          } catch {
            return { saved: false, conflict: false };
          } finally {
            inFlight.current -= 1;
            reportPending();
          }
        },
        fetchPage: async () => {
          inFlight.current += 1;
          try {
            return await callbacks.current.fetchPage();
          } catch {
            return null;
          } finally {
            inFlight.current -= 1;
            reportPending();
          }
        },
        editor: () => ({
          getDocument: () => editor.document as DocBlock[],
          replaceDocument: (blocks, { save }) => replaceDocument(editor, blocks, save, silent),
        }),
        onStatus: (status) => void callbacks.current.onStatus(status),
        onConflict: (result) => void callbacks.current.onConflict(result),
      }),
    [editor],
  );

  useEffect(() => {
    sync.ready(JSON.stringify(editor.document), revision, hasBlockWithoutId(initialContent ?? []));
  }, [sync]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendNow = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (latest.current) void sync.requestSave(latest.current);
    reportPending();
  };

  const onChange = () => {
    latest.current = JSON.stringify(editor.document);
    if (silent.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(sendNow, SAVE_DELAY_MS);
    reportPending();
  };

  useDOMImperativeHandle(
    ref as Ref<NotebookEditorHandle>,
    () => ({
      command: (command) => run(editor, command as EditorCommand),
      serverChanged: (page) => void sync.serverChanged(page as ServerPage),
      resolve: (choices) => void sync.resolve(choices as Record<string, ConflictChoice>),
      flush: () => sendNow(),
    }),
    [editor, sync],
  );

  useFormatReports(editor, (format) => void callbacks.current.onFormat(format));
  useKnownCodeLanguages(editor);
  useCursorInView(editor);
  useLinksOpenOutside((url) => void callbacks.current.openLink(url));

  const embeds = useMemo<Embeds>(
    () => ({
      strings,
      cardsTotal,
      openBoard: () => void callbacks.current.openBoard(),
      openCards: () => void callbacks.current.openCards(),
    }),
    [strings, cardsTotal],
  );

  return (
    <EmbedContext.Provider value={embeds}>
      <div
        className="nb-root"
        style={paletteVars(palette)}
        data-testid="notebook-editor"
        onClick={(event) => {
          // The space under the last block is most of an empty page; a tap there writes at the end.
          if (!(event.target as HTMLElement).closest('.bn-block-group')) focusEnd(editor);
        }}
      >
        <BlockNoteView
          editor={editor}
          theme={editorTheme(palette)}
          sideMenu={false}
          formattingToolbar={false}
          onChange={onChange}
        />
      </div>
    </EmbedContext.Provider>
  );
}

/**
 * The cursor at the end of the page. A page that ends in a block with no text of its own to
 * continue (the board, the cards, a divider, code) gets a paragraph after it, as Notion does.
 */
function focusEnd(editor: Editor) {
  const blocks = editor.document;
  const last = blocks[blocks.length - 1];
  if (!last) return;
  const writable = Array.isArray(last.content) && last.type !== 'codeBlock';
  const target = writable ? last : editor.insertBlocks([{ type: 'paragraph' }] as PartialBlocks, last, 'after')[0];
  editor.setTextCursorPosition(target, 'end');
  editor.focus();
}

/** The web editor's replace: only the stretch that differs is swapped, the rest stays put. */
function replaceDocument(editor: Editor, blocks: DocBlock[], save: boolean, silent: { current: boolean }) {
  silent.current = !save;
  try {
    const current = editor.document as DocBlock[];
    const { start, removed, added } = documentPatch(current, blocks);
    const out = removed as Block[];
    const into = added as PartialBlocks;
    if (out.length > 0 && into.length > 0) editor.replaceBlocks(out, into);
    else if (into.length > 0 && start > 0) editor.insertBlocks(into, current[start - 1].id!, 'after');
    else if (into.length > 0) editor.insertBlocks(into, current[0].id!, 'before');
    else if (out.length > 0) editor.removeBlocks(out);
  } finally {
    silent.current = false;
  }
}

const BLOCKS: Record<BlockChoice, { type: string; props?: Record<string, unknown> }> = {
  paragraph: { type: 'paragraph' },
  heading1: { type: 'heading', props: { level: 1 } },
  heading2: { type: 'heading', props: { level: 2 } },
  heading3: { type: 'heading', props: { level: 3 } },
  bulletListItem: { type: 'bulletListItem' },
  numberedListItem: { type: 'numberedListItem' },
  checkListItem: { type: 'checkListItem' },
  quote: { type: 'quote' },
  codeBlock: { type: 'codeBlock' },
  divider: { type: 'divider' },
};

function run(editor: Editor, command: EditorCommand) {
  const block = editor.getTextCursorPosition().block;
  switch (command.kind) {
    case 'style':
      editor.toggleStyles({ [command.style]: true });
      break;
    case 'turnInto': {
      // The block already is that kind: the tap turns it back into text, as a toggle reads.
      const target = choiceOf(block) === command.block ? BLOCKS.paragraph : BLOCKS[command.block];
      editor.updateBlock(block, target as Parameters<Editor['updateBlock']>[1]);
      break;
    }
    case 'insert': {
      const target = BLOCKS[command.block];
      const emptyText = block.type === 'paragraph' && Array.isArray(block.content) && block.content.length === 0;
      if (emptyText && command.block !== 'divider') {
        editor.updateBlock(block, target as Parameters<Editor['updateBlock']>[1]);
      } else {
        const [inserted] = editor.insertBlocks([target] as PartialBlocks, block, 'after');
        if (command.block === 'divider') {
          const [after] = editor.insertBlocks([{ type: 'paragraph' }] as PartialBlocks, inserted, 'after');
          editor.setTextCursorPosition(after, 'start');
        } else {
          editor.setTextCursorPosition(inserted, 'start');
        }
      }
      break;
    }
    case 'link': {
      // An empty address takes the link off. With nothing selected the address becomes the text.
      const url = command.url.trim();
      if (!url) editor.deleteLink();
      else editor.createLink(url, editor.getSelectedText() || url);
      break;
    }
    case 'indent':
      if (editor.canNestBlock()) editor.nestBlock();
      break;
    case 'outdent':
      if (editor.canUnnestBlock()) editor.unnestBlock();
      break;
    case 'undo':
      editor.undo();
      break;
    case 'redo':
      editor.redo();
      break;
    case 'dismiss':
      editor.blur();
      return;
  }
  editor.focus();
}

function choiceOf(block: Block): BlockChoice | 'other' {
  if (block.type === 'heading') {
    const level = (block.props as { level?: number }).level;
    return level === 1 ? 'heading1' : level === 2 ? 'heading2' : 'heading3';
  }
  return block.type in BLOCKS ? (block.type as BlockChoice) : 'other';
}

/** Tells the screen what the cursor sits in, when that changes. */
function useFormatReports(editor: Editor, report: (format: EditorFormat) => void) {
  const last = useRef('');
  useEffect(() => {
    const send = () => {
      const styles = editor.getActiveStyles() as Partial<Record<string, boolean>>;
      const format: EditorFormat = {
        styles: {
          bold: !!styles.bold,
          italic: !!styles.italic,
          underline: !!styles.underline,
          strike: !!styles.strike,
          code: !!styles.code,
        },
        link: editor.getSelectedLinkUrl() ?? null,
        block: choiceOf(editor.getTextCursorPosition().block),
        canIndent: editor.canNestBlock(),
        canOutdent: editor.canUnnestBlock(),
      };
      const key = JSON.stringify(format);
      if (key === last.current) return;
      last.current = key;
      report(format);
    };
    const offSelection = editor.onSelectionChange(send);
    const offChange = editor.onChange(send);
    return () => {
      offSelection();
      offChange();
    };
  }, [editor]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** The web editor's rule: a code block typed with a language the picker does not list moves to one it does. */
function useKnownCodeLanguages(editor: Editor) {
  useEffect(
    () =>
      editor.onChange(() => {
        if (!hasUnknownLanguage(editor.document)) return;
        setTimeout(() => {
          const visit = (blocks: Block[]) => {
            for (const block of blocks) {
              const language = (block.props as { language?: unknown }).language;
              if (block.type === 'codeBlock' && normalizeCodeLanguage(language) !== language) {
                editor.updateBlock(block, { props: { language: normalizeCodeLanguage(language) } });
              }
              visit(block.children as Block[]);
            }
          };
          visit(editor.document as Block[]);
        }, 0);
      }),
    [editor],
  );
}

/**
 * The keyboard takes the bottom of the screen by shrinking the web view, and a browser does not
 * scroll a caret that the shrink left below the fold. The cursor would sit under the toolbar,
 * typed into but unseen. After a resize, and when the cursor moves while the editor has focus, the
 * view scrolls just enough to show it.
 */
function useCursorInView(editor: Editor) {
  useEffect(() => {
    const MARGIN = 32;
    const show = () => {
      if (!editor.isFocused()) return;
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      let rect = selection.getRangeAt(0).getBoundingClientRect();
      // A cursor in an empty block has no box of its own; its block's box stands in.
      if (rect.top === 0 && rect.bottom === 0) {
        const node = selection.focusNode;
        const element = node instanceof Element ? node : node?.parentElement;
        if (!element) return;
        rect = element.getBoundingClientRect();
      }
      const height = window.visualViewport?.height ?? window.innerHeight;
      if (rect.bottom > height - MARGIN) window.scrollBy({ top: rect.bottom - height + MARGIN * 2 });
      else if (rect.top < MARGIN) window.scrollBy({ top: rect.top - MARGIN * 2 });
    };
    const later = () => setTimeout(show, 60);
    window.addEventListener('resize', later);
    window.visualViewport?.addEventListener('resize', later);
    const offSelection = editor.onSelectionChange(later);
    return () => {
      window.removeEventListener('resize', later);
      window.visualViewport?.removeEventListener('resize', later);
      offSelection();
    };
  }, [editor]);
}

/**
 * A link followed inside the web view would replace the editor with the page it points to. Links
 * open in the phone's browser instead, whether tapped or opened from BlockNote's link toolbar.
 */
function useLinksOpenOutside(open: (url: string) => void) {
  const opener = useRef(open);
  opener.current = open;
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      event.preventDefault();
      // Inside the text a tap places the cursor, as it does on the web; the link toolbar opens it.
      if (anchor.closest('.bn-inline-content')) return;
      opener.current(anchor.href);
    };
    const original = window.open;
    window.open = ((url?: string | URL) => {
      if (url) opener.current(String(url));
      return null;
    }) as typeof window.open;
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.open = original;
    };
  }, []);
}

function dictionaryFor(language: string, placeholder: string) {
  const base = language.startsWith('pt') ? bnPt : bnEn;
  return { ...base, placeholders: { ...base.placeholders, emptyDocument: placeholder, default: placeholder } };
}

function paletteVars(palette: EditorPalette): CSSProperties {
  return {
    '--nb-bg': palette.bg,
    '--nb-surface': palette.surface,
    '--nb-surface-2': palette.surface2,
    '--nb-border': palette.border,
    '--nb-text': palette.text,
    '--nb-text-2': palette.text2,
    '--nb-text-3': palette.text3,
    '--nb-accent': palette.accent,
    '--nb-accent-soft': palette.accentSoft,
    '--nb-xp': palette.xp,
    '--nb-xp-soft': palette.xpSoft,
    '--nb-text-faint': palette.textFaint,
  } as CSSProperties;
}

function editorTheme(palette: EditorPalette): EditorTheme {
  return {
    colors: {
      editor: { text: palette.text, background: palette.bg },
      menu: { text: palette.text, background: palette.surface },
      tooltip: { text: palette.text, background: palette.surface2 },
      hovered: { text: palette.text, background: palette.surface2 },
      selected: { text: palette.onAccent, background: palette.accent },
      disabled: { text: palette.text3, background: palette.surface2 },
      shadow: palette.textFaint,
      border: palette.border,
      sideMenu: palette.text3,
    },
    borderRadius: 10,
    fontFamily: 'Geist, system-ui, sans-serif',
  };
}
