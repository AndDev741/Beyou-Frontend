import { memo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Node, NodeProps } from "@xyflow/react";
import { Archive, ListChecks } from "lucide-react";
import type { NotePaint } from "@beyou/state";
import {
    QUICK_NOTE_COLORS,
    QUICK_NOTE_TEXT_MAX,
    type QuickNote,
    type QuickNoteColor,
} from "@beyou/types/quickNote/quickNote";
import { CHARS_LEFT_HINT_AT } from "./quickCapture";

/** What a note can ask of the board. One stable object, so a memoised note does not redraw. */
export type NoteActions = {
    startEdit: (id: string) => void;
    /** `id` is null for the draft a double-click on the board opened. */
    saveText: (id: string | null, text: string) => void;
    cancelEdit: (id: string | null) => void;
    setColor: (id: string, color: QuickNoteColor) => void;
    makeTask: (id: string) => void;
    archive: (id: string) => void;
};

/** A note being written where someone double-clicked the board. It has no id until it is saved. */
export type DraftNote = {
    x: number;
    y: number;
    color: QuickNoteColor;
    /** Set while the save is in flight: the note shows its text and waits for the server. */
    savingText: string | null;
    /** What was typed before a failed save, so the editor reopens with it. */
    text: string;
};

export type StickyNoteData = {
    /** Null for the draft. */
    note: QuickNote | null;
    draft?: DraftNote;
    paint: NotePaint;
    palette: Record<QuickNoteColor, NotePaint>;
    editing: boolean;
    actions: NoteActions;
};

export type StickyFlowNode = Node<StickyNoteData, "stickyNote">;

/** Strip, text and toolbar share these, so the editor sits exactly where the text did. */
const TEXT_CLASS = "px-3.5 pt-2.5 text-[13.5px] leading-[1.45]";

/**
 * A post-it on the Ideas board: a coloured strip along the top, the text, and a toolbar that
 * shows on hover, keyboard focus or selection (see `ideas.css`), with the colours and the two
 * ways off the board.
 *
 * The paint comes from `noteColors` for the current theme base, the same values the phone draws
 * with, so a yellow note is the same yellow on both.
 */
export const StickyNoteNode = memo(function StickyNoteNode({ data, selected }: NodeProps<StickyFlowNode>) {
    const { t } = useTranslation();
    const { note, draft, paint, palette, editing, actions } = data;

    if (editing) {
        return <NoteEditor note={note} draft={draft} paint={paint} actions={actions} />;
    }

    const text = note?.text ?? draft?.savingText ?? "";
    const frame = selected ? "ring-2 ring-accent ring-offset-2 ring-offset-bg" : "";

    return (
        <div
            data-testid={note ? "quick-note" : "quick-note-draft"}
            data-note-id={note?.id}
            data-color={note?.color ?? draft?.color}
            aria-busy={note ? undefined : true}
            className={`quick-note relative flex h-full w-full flex-col overflow-hidden rounded-[5px] border shadow-surface ${frame} ${note ? "" : "opacity-70"}`}
            style={{ backgroundColor: paint.paper, borderColor: paint.edge, color: paint.ink }}
        >
            <span aria-hidden="true" className="h-2 shrink-0" style={{ backgroundColor: paint.edge }} />
            <p className={`min-h-0 flex-1 overflow-hidden whitespace-pre-wrap break-words ${TEXT_CLASS}`}>{text}</p>
            {/* Long notes fade out instead of being cut mid-line. */}
            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-6"
                style={{ background: `linear-gradient(to bottom, transparent, ${paint.paper})` }}
            />
            {note && (
                <div
                    className="quick-note-toolbar nodrag nopan absolute inset-x-0 bottom-0 flex items-center justify-between border-t px-1.5 py-1"
                    style={{ backgroundColor: paint.paper, borderColor: paint.edge }}
                >
                    <div role="group" aria-label={t("IdeasColor")} className="flex items-center">
                        {QUICK_NOTE_COLORS.map((color) => {
                            const active = note.color === color;
                            return (
                                <button
                                    key={color}
                                    type="button"
                                    aria-label={t(`IdeasColor_${color}`)}
                                    title={t(`IdeasColor_${color}`)}
                                    aria-pressed={active}
                                    data-testid={`quick-note-color-${color}`}
                                    onClick={() => {
                                        if (!active) actions.setColor(note.id, color);
                                    }}
                                    className="flex h-5 w-5 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-current"
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`block rounded-full border ${active ? "h-3.5 w-3.5 border-2" : "h-3 w-3"}`}
                                        style={{
                                            backgroundColor: palette[color].paper,
                                            borderColor: active ? paint.ink : palette[color].edge,
                                        }}
                                    />
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center">
                        <button
                            type="button"
                            aria-label={t("IdeasMakeTask")}
                            title={t("IdeasMakeTask")}
                            data-testid="quick-note-make-task"
                            onClick={() => actions.makeTask(note.id)}
                            className="flex h-6 w-6 items-center justify-center rounded-md opacity-75 transition-opacity duration-150 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-current"
                        >
                            <ListChecks size={14} aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            aria-label={t("IdeasArchive")}
                            title={t("IdeasArchive")}
                            data-testid="quick-note-archive"
                            onClick={() => actions.archive(note.id)}
                            className="flex h-6 w-6 items-center justify-center rounded-md opacity-75 transition-opacity duration-150 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-current"
                        >
                            <Archive size={14} aria-hidden="true" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

/**
 * The note's text, editable in place. Escape puts it back as it was; leaving the field or
 * Ctrl+Enter (Cmd+Enter) keeps it. Plain Enter is a new line, as on paper.
 */
function NoteEditor({
    note,
    draft,
    paint,
    actions,
}: {
    note: QuickNote | null;
    draft?: DraftNote;
    paint: NotePaint;
    actions: NoteActions;
}) {
    const { t } = useTranslation();
    const [value, setValue] = useState(note?.text ?? draft?.text ?? "");
    // Escape, then the blur that follows it, must not also save.
    const done = useRef(false);
    const id = note?.id ?? null;
    const left = QUICK_NOTE_TEXT_MAX - value.length;

    const finish = (save: boolean) => {
        if (done.current) return;
        done.current = true;
        if (save) actions.saveText(id, value);
        else actions.cancelEdit(id);
    };

    return (
        <div
            data-testid={note ? "quick-note-editing" : "quick-note-draft"}
            data-note-id={note?.id}
            className="relative flex h-full w-full flex-col overflow-hidden rounded-[5px] border shadow-surface ring-2 ring-accent ring-offset-2 ring-offset-bg"
            style={{ backgroundColor: paint.paper, borderColor: paint.edge, color: paint.ink }}
        >
            <span aria-hidden="true" className="h-2 shrink-0" style={{ backgroundColor: paint.edge }} />
            <textarea
                autoFocus
                value={value}
                maxLength={QUICK_NOTE_TEXT_MAX}
                aria-label={t(note ? "IdeasEdit" : "IdeasCaptureLabel")}
                data-testid="quick-note-editor"
                onChange={(event) => setValue(event.target.value)}
                onFocus={(event) => {
                    const end = event.target.value.length;
                    event.target.setSelectionRange(end, end);
                }}
                onKeyDown={(event) => {
                    if (event.key === "Escape") {
                        event.preventDefault();
                        event.stopPropagation();
                        finish(false);
                    } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                        event.preventDefault();
                        finish(true);
                    }
                }}
                onBlur={() => finish(true)}
                className={`nodrag nopan nowheel min-h-0 flex-1 resize-none bg-transparent focus:outline-none ${TEXT_CLASS}`}
                style={{ color: paint.ink }}
            />
            {left <= CHARS_LEFT_HINT_AT && (
                <span aria-live="polite" className="absolute bottom-1.5 right-2 font-mono text-[10.5px] opacity-75">
                    {t("IdeasCharsLeft", { count: left })}
                </span>
            )}
        </div>
    );
}

export const NOTE_TYPES = { stickyNote: StickyNoteNode };
