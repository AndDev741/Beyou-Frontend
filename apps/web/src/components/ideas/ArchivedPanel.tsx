import { useEffect, useId, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ListChecks, Trash2, Undo2, X } from "lucide-react";
import { noteColors } from "@beyou/state";
import type { QuickNote } from "@beyou/types/quickNote/quickNote";
import IconButton from "../../ui/IconButton";
import { useTheme } from "../../context/ThemeContext";

type ArchivedPanelProps = {
    id: string;
    open: boolean;
    /** Null until the list has been read. */
    notes: QuickNote[] | null;
    onClose: () => void;
    onRestore: (note: QuickNote) => void;
    onDelete: (note: QuickNote) => void;
    /** The note a restore is waiting on, so its button cannot be pressed twice. */
    busyId: string | null;
    /** The list could not be read. */
    failed: boolean;
    onRetry: () => void;
};

const actionClass =
    "inline-flex h-8 items-center gap-1.5 rounded-control px-2.5 text-[12.5px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Notes taken off the board, newest first: back to the board, or deleted for good. A note that
 * became a task says so, and can still come back if the idea turns out bigger than the task.
 *
 * Beside the board from `lg`, over it below that. It is a non-modal dialog: the board stays
 * usable beside it on a wide screen, and Escape or the close button hands focus back to the
 * button that opened it.
 */
export default function ArchivedPanel({
    id,
    open,
    notes,
    onClose,
    onRestore,
    onDelete,
    busyId,
    failed,
    onRetry,
}: ArchivedPanelProps) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const palette = useMemo(() => noteColors(theme.base), [theme.base]);
    const titleId = useId();
    const headingRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        if (open) headingRef.current?.focus();
    }, [open]);

    if (!open) return null;

    return (
        <section
            id={id}
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            data-testid="ideas-archived-panel"
            onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                event.stopPropagation();
                onClose();
            }}
            className="absolute inset-0 z-20 flex flex-col bg-surface lg:left-auto lg:w-[340px] lg:border-l lg:border-border lg:shadow-surface"
        >
            <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                <h2
                    id={titleId}
                    ref={headingRef}
                    tabIndex={-1}
                    className="text-[15px] font-semibold tracking-[-0.01em] text-text focus:outline-none"
                >
                    {t("IdeasArchived")}
                </h2>
                <IconButton label={t("Close")} onClick={onClose}>
                    <X size={16} aria-hidden="true" />
                </IconButton>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {notes === null && failed ? (
                    <div role="alert" className="flex flex-col items-center gap-3 px-1 py-8 text-center text-[13px] text-danger">
                        {t("IdeasLoadFailed")}
                        <button
                            type="button"
                            onClick={onRetry}
                            className={`${actionClass} border border-border bg-surface text-text-2 hover:bg-surface-2 hover:text-text`}
                        >
                            {t("TryAgain")}
                        </button>
                    </div>
                ) : notes === null ? (
                    <div className="flex justify-center py-10" aria-busy="true">
                        <span className="inline-block h-6 w-6 animate-spin rounded-full border-[3px] border-border border-t-transparent" />
                    </div>
                ) : notes.length === 0 ? (
                    <p className="px-1 py-6 text-center text-[13px] text-text-3">{t("IdeasArchivedEmpty")}</p>
                ) : (
                    <ul className="flex flex-col gap-2.5">
                        {notes.map((note) => (
                            <li
                                key={note.id}
                                data-testid="archived-note"
                                data-note-id={note.id}
                                className="rounded-control border border-l-4 border-border bg-surface-2/40 p-3"
                                style={{ borderLeftColor: palette[note.color].edge }}
                            >
                                <p className="line-clamp-4 whitespace-pre-wrap break-words text-[13px] leading-snug text-text">
                                    {note.text}
                                </p>
                                {note.convertedTaskId && (
                                    <span
                                        className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent"
                                        data-testid="archived-note-became-task"
                                    >
                                        <ListChecks size={12} aria-hidden="true" />
                                        {t("IdeasBecameTask")}
                                    </span>
                                )}
                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => onRestore(note)}
                                        disabled={busyId === note.id}
                                        className={`${actionClass} border border-border bg-surface text-text-2 hover:bg-surface-2 hover:text-text`}
                                    >
                                        <Undo2 size={13} aria-hidden="true" />
                                        {t("IdeasRestore")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDelete(note)}
                                        className={`${actionClass} bg-danger/10 text-danger hover:bg-danger/15`}
                                    >
                                        <Trash2 size={13} aria-hidden="true" />
                                        {t("IdeasDeleteForever")}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
