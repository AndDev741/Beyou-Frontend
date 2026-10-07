import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu } from "@blocknote/core";
import { en as bnEn, pt as bnPt } from "@blocknote/core/locales";
import {
    SuggestionMenuController,
    getDefaultReactSlashMenuItems,
    useCreateBlockNote,
    type DefaultReactSuggestionItem,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { Layers, Sparkles, Workflow } from "lucide-react";
import { BOARD_BLOCK_TYPE } from "@beyou/types/notebook/notebook";
import { notebookSchema, type NotebookBlock, type NotebookEditor as Editor } from "./schema";
import { NotebookPageContext } from "./NotebookPageContext";
import { isEmptyDocument } from "./emptyDocument";
import { hasUnknownLanguage, normalizeCodeLanguage, withKnownLanguages } from "./codeLanguages";
import type { Theme as EditorTheme } from "@blocknote/mantine";

type Props = {
    pageId: string;
    pageTitle: string;
    cardsTotal: number;
    /** The stored document, or null for a page nobody has written in yet. */
    content: string | null;
    onSave: (json: string) => Promise<void>;
    /** "Explain the block above": the text of the block before the cursor. */
    onExplain: (text: string) => void;
};

/** Debounce for the autosave. Long enough to batch a typed sentence, short enough to lose nothing. */
const SAVE_DELAY_MS = 900;

/**
 * The page's document, edited with BlockNote, saved as JSON while the person types.
 *
 * The slash menu has the editor's own blocks plus three of the notebook's: a roadmap board (one
 * per page, so it leaves the menu once the page shows one), flashcards, and "Explain the block
 * above", which asks the study AI about the text the cursor follows.
 */
export default function NotebookEditor({ pageId, pageTitle, cardsTotal, content, onSave, onExplain }: Props) {
    const { t, i18n } = useTranslation();
    const initialContent = useMemo(() => parse(content), [pageId]); // eslint-disable-line react-hooks/exhaustive-deps
    const editor = useCreateBlockNote(
        {
            schema: notebookSchema,
            initialContent,
            dictionary: {
                ...(i18n.language?.startsWith("pt") ? bnPt : bnEn),
                placeholders: {
                    ...(i18n.language?.startsWith("pt") ? bnPt : bnEn).placeholders,
                    emptyDocument: t("NotebookEditorPlaceholder"),
                    default: t("NotebookEditorPlaceholder"),
                },
            },
        },
        [pageId]
    );

    const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latest = useRef<string | null>(null);
    useEffect(() => {
        return () => {
            // Leaving the page with a save still waiting: send it now rather than drop it.
            if (pending.current) {
                clearTimeout(pending.current);
                if (latest.current) void onSave(latest.current);
            }
        };
    }, [pageId]); // eslint-disable-line react-hooks/exhaustive-deps

    const onChange = () => {
        latest.current = JSON.stringify(editor.document);
        if (pending.current) clearTimeout(pending.current);
        pending.current = setTimeout(() => {
            pending.current = null;
            if (latest.current) void onSave(latest.current);
        }, SAVE_DELAY_MS);
    };

    const hasBoard = useBoardPresence(editor);
    const empty = useEmptiness(editor);
    useKnownCodeLanguages(editor);

    /**
     * The starters put their block in front of what the editor holds, never in place of it. They
     * used to write a new document to the server, and the page decided they could show from a copy
     * of the page that autosave does not update: on a page that started empty they stayed up while
     * the person wrote, and "Add cards" replaced everything written with one cards block.
     */
    const start = (type: typeof BOARD_BLOCK_TYPE | "flashcards") => {
        editor.insertBlocks([{ type }], editor.document[0], "before");
        const blocks = editor.document;
        editor.setTextCursorPosition(blocks[blocks.length - 1], "end");
        editor.focus();
    };

    const getItems = async (query: string) =>
        filterSuggestionItems(
            [...getDefaultReactSlashMenuItems(editor), ...notebookItems(editor, t, hasBoard, onExplain)],
            query
        );

    return (
        <NotebookPageContext.Provider value={{ pageId, pageTitle, cardsTotal }}>
            {empty && (
                <div className="mb-4 flex flex-wrap gap-2" data-testid="page-starters">
                    <button type="button" onClick={() => start(BOARD_BLOCK_TYPE)} data-testid="start-board"
                        className="inline-flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-2 text-sm font-semibold text-text hover:bg-surface-2">
                        <Workflow size={15} className="text-accent" aria-hidden="true" />{t("NotebookStartBoard")}
                    </button>
                    <button type="button" onClick={() => start("flashcards")} data-testid="start-cards"
                        className="inline-flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-2 text-sm font-semibold text-text hover:bg-surface-2">
                        <Layers size={15} className="text-xp" aria-hidden="true" />{t("NotebookStartCards")}
                    </button>
                </div>
            )}
            <div className="beyou-editor -mx-[54px]" data-testid="notebook-editor">
                <BlockNoteView
                    editor={editor}
                    slashMenu={false}
                    onChange={onChange}
                    theme={EDITOR_THEME}
                >
                    <SuggestionMenuController triggerCharacter="/" getItems={getItems} />
                </BlockNoteView>
            </div>
        </NotebookPageContext.Provider>
    );
}

/**
 * The editor in Beyou's colours. Every value is a theme variable, so it follows the light and dark
 * bases and the accent packs the way the rest of the app does, with no branch here.
 */
const EDITOR_THEME: EditorTheme = {
    colors: {
        editor: { text: "rgb(var(--text-rgb))", background: "transparent" },
        menu: { text: "rgb(var(--text-rgb))", background: "rgb(var(--surface-rgb))" },
        tooltip: { text: "rgb(var(--text-rgb))", background: "rgb(var(--surface-2-rgb))" },
        hovered: { text: "rgb(var(--text-rgb))", background: "rgb(var(--surface-2-rgb))" },
        selected: { text: "rgb(var(--on-accent-rgb))", background: "rgb(var(--accent-rgb))" },
        disabled: { text: "rgb(var(--text-3-rgb))", background: "rgb(var(--surface-2-rgb))" },
        shadow: "rgb(var(--text-rgb) / 0.08)",
        border: "rgb(var(--border-rgb))",
        sideMenu: "rgb(var(--text-3-rgb))",
    },
    borderRadius: 10,
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
};

function notebookItems(
    editor: Editor,
    t: (key: string) => string,
    hasBoard: boolean,
    onExplain: (text: string) => void
): DefaultReactSuggestionItem[] {
    const items: DefaultReactSuggestionItem[] = [];
    if (!hasBoard) {
        items.push({
            title: t("NotebookSlashBoard"),
            subtext: t("NotebookSlashBoardHint"),
            aliases: ["roadmap", "board", "quadro", "mapa"],
            group: t("NotebookSlashGroupStudy"),
            icon: <Workflow size={18} />,
            onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: BOARD_BLOCK_TYPE }),
        });
    }
    items.push({
        title: t("NotebookSlashCards"),
        subtext: t("NotebookSlashCardsHint"),
        aliases: ["flashcards", "cards", "cartoes", "cartões"],
        group: t("NotebookSlashGroupStudy"),
        icon: <Layers size={18} />,
        onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "flashcards" }),
    });
    items.push({
        title: t("NotebookSlashExplain"),
        subtext: t("NotebookSlashExplainHint"),
        aliases: ["explain", "ai", "ia", "explicar"],
        group: t("NotebookSlashGroupAi"),
        icon: <Sparkles size={18} />,
        onItemClick: () => {
            const text = textBeforeCursor(editor);
            if (text) onExplain(text);
        },
    });
    return items;
}

/** The text of the nearest block above the cursor that has any. */
function textBeforeCursor(editor: Editor): string {
    const blocks = editor.document as NotebookBlock[];
    const current = editor.getTextCursorPosition().block;
    const index = blocks.findIndex((b) => b.id === current.id);
    for (let i = (index < 0 ? blocks.length : index) - 1; i >= 0; i--) {
        const text = blockText(blocks[i]);
        if (text.trim()) return text.trim().slice(0, 4000);
    }
    return "";
}

function blockText(block: NotebookBlock): string {
    const content = (block as { content?: unknown }).content;
    if (!Array.isArray(content)) return "";
    return content.map((part: { text?: string }) => part?.text ?? "").join("");
}

/** Whether the page already shows its board, which takes "Roadmap board" out of the menu. */
function useBoardPresence(editor: Editor): boolean {
    const [present, setPresent] = useState(() => hasBoardBlock(editor.document as NotebookBlock[]));
    useEffect(
        () => editor.onChange(() => setPresent(hasBoardBlock(editor.document as NotebookBlock[]))),
        [editor]
    );
    return present;
}

/**
 * A code block typed with a language the picker does not list ("```cs ") is moved to the id it
 * stands for, or to "text". Deferred a tick: a block cannot be updated from inside the change
 * that created it.
 */
function useKnownCodeLanguages(editor: Editor) {
    useEffect(
        () => editor.onChange(() => {
            if (!hasUnknownLanguage(editor.document)) return;
            setTimeout(() => {
                const visit = (blocks: NotebookBlock[]) => {
                    for (const block of blocks) {
                        const language = (block.props as { language?: unknown }).language;
                        if (block.type === "codeBlock" && normalizeCodeLanguage(language) !== language) {
                            editor.updateBlock(block, { props: { language: normalizeCodeLanguage(language) } });
                        }
                        visit(block.children as NotebookBlock[]);
                    }
                };
                visit(editor.document as NotebookBlock[]);
            }, 0);
        }),
        [editor]
    );
}

/** Whether the document has nothing in it yet, read from the editor as it changes. */
function useEmptiness(editor: Editor): boolean {
    const [empty, setEmpty] = useState(() => isEmptyDocument(editor.document as NotebookBlock[]));
    useEffect(() => editor.onChange(() => setEmpty(isEmptyDocument(editor.document as NotebookBlock[]))), [editor]);
    return empty;
}

function hasBoardBlock(blocks: NotebookBlock[]): boolean {
    return blocks.some((b) => b.type === BOARD_BLOCK_TYPE);
}

/** The stored JSON as initial content; anything unreadable starts the page empty. */
function parse(content: string | null) {
    if (!content) return undefined;
    try {
        const blocks = JSON.parse(content);
        return Array.isArray(blocks) && blocks.length > 0 ? withKnownLanguages(blocks) : undefined;
    } catch {
        return undefined;
    }
}
