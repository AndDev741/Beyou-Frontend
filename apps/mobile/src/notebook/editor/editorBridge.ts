import type { DOMImperativeFactory } from 'expo/dom';

/** What a call into a DOM component may carry: JSON values, as `expo/dom` types them. */
type JsonArgs = Parameters<DOMImperativeFactory[string]>;

/**
 * What crosses between the editor screen (native) and the editor (BlockNote in a web view).
 *
 * The editor and the {@link DocumentSync} that saves it live together in the web view, so a merge
 * reads the document the person sees, not a copy from a moment ago. The screen does the network
 * (save, read the page), shows the save state and the conflict sheet, and sends formatting
 * commands from its toolbar.
 *
 * Kept out of the `'use dom'` file: that file is swapped for a web view on the phone, and only its
 * default export survives the swap.
 */

/** Inline styles the toolbar toggles, by BlockNote's names. */
export type InlineStyle = 'bold' | 'italic' | 'underline' | 'strike' | 'code';

/** A block the "+" and "Aa" sheets can make. `heading` takes a level. */
export type BlockChoice =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bulletListItem'
  | 'numberedListItem'
  | 'checkListItem'
  | 'quote'
  | 'codeBlock'
  | 'divider';

/** Where the cursor is, for the toolbar to light the buttons that apply. */
export type EditorFormat = {
  styles: Record<InlineStyle, boolean>;
  /** The link under the cursor, if any. */
  link: string | null;
  block: BlockChoice | 'other';
  canIndent: boolean;
  canOutdent: boolean;
};

export const NO_FORMAT: EditorFormat = {
  styles: { bold: false, italic: false, underline: false, strike: false, code: false },
  link: null,
  block: 'paragraph',
  canIndent: false,
  canOutdent: false,
};

/** A command from the toolbar. */
export type EditorCommand =
  | { kind: 'style'; style: InlineStyle }
  | { kind: 'turnInto'; block: BlockChoice }
  | { kind: 'insert'; block: BlockChoice }
  | { kind: 'link'; url: string }
  | { kind: 'indent' }
  | { kind: 'outdent' }
  | { kind: 'undo' }
  | { kind: 'redo' }
  | { kind: 'dismiss' };

/** The editor's colours, from the app theme: the web view cannot read NativeWind's variables. */
export type EditorPalette = {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  text2: string;
  text3: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  xp: string;
  xpSoft: string;
  /** Link underline and the selection wash: text at low alpha. */
  textFaint: string;
};

/** Copy the editor shows, translated on the native side. */
export type EditorStrings = {
  placeholder: string;
  board: string;
  boardHint: string;
  cards: string;
  cardsHint: string;
};

/**
 * Calls from the screen into the editor. Each crosses as injected script, so each takes JSON and
 * answers nothing: the editor reports back through its callbacks.
 */
export interface NotebookEditorHandle extends DOMImperativeFactory {
  /** Runs an {@link EditorCommand}. */
  command: (...args: JsonArgs) => void;
  /** The page as the server sent it (a `ServerPage`), merged in when it is newer. */
  serverChanged: (...args: JsonArgs) => void;
  /** Settles a conflict: a `Record<blockId, ConflictChoice>`. */
  resolve: (...args: JsonArgs) => void;
  /** Sends a save still waiting on the debounce, now. */
  flush: (...args: JsonArgs) => void;
}
