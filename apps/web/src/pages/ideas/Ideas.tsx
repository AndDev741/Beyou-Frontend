import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { Archive, LayoutGrid, Scan, StickyNote } from "lucide-react";
import { getFriendlyErrorMessage, type ApiErrorPayload } from "@beyou/api/apiError";
import { quickNoteTaskPrefill } from "@beyou/state";
import type { RootState } from "@beyou/state/rootReducer";
import {
    QUICK_NOTE_COORD_LIMIT,
    QUICK_NOTE_HEIGHT,
    QUICK_NOTE_MAX_ACTIVE,
    QUICK_NOTE_WIDTH,
    type QuickNote,
} from "@beyou/types/quickNote/quickNote";
import useAuthGuard from "../../components/useAuthGuard";
import { useNoDesktopSpacer } from "../../components/shell/desktopSpacer";
import PageHeader from "../../ui/PageHeader";
import Button from "../../components/Button";
import Modal from "../../components/modals/Modal";
import TaskForm, { TASK_FORM_TITLE_ID } from "../../components/tasks/TaskForm";
import CaptureField from "../../components/ideas/CaptureField";
import IdeasBoard, { FIT_OPTIONS } from "../../components/ideas/IdeasBoard";
import ArchivedPanel from "../../components/ideas/ArchivedPanel";
import type { DraftNote, NoteActions } from "../../components/ideas/StickyNoteNode";
import { useQuickNotes } from "../../components/ideas/useQuickNotes";
import {
    isEditableTarget,
    isModalOpen,
    isQuickCaptureShortcut,
    prefersReducedMotion,
} from "../../components/ideas/quickCapture";

type LoadStatus = "loading" | "ready" | "error";

const clampCoord = (value: number) =>
    Math.max(-QUICK_NOTE_COORD_LIMIT, Math.min(QUICK_NOTE_COORD_LIMIT, Math.round(value)));

/**
 * Ideas: quick notes on a free board, an inbox for whatever crosses the mind.
 *
 * The capture field sits above the board and takes Enter, so getting an idea down takes
 * seconds; the server finds it a free spot. A double-click on an empty spot of the board writes
 * one right there instead. Notes are dragged anywhere, recoloured, tidied into a grid, archived,
 * or turned into a task through the ordinary task form.
 *
 * The board fills the page: the whole viewport on desktop (the shell's bottom spacer is off) and
 * everything above the bottom bar on a phone.
 */
export default function Ideas() {
    useAuthGuard();
    useNoDesktopSpacer();
    return (
        <ReactFlowProvider>
            <IdeasScreen />
        </ReactFlowProvider>
    );
}

function IdeasScreen() {
    const { t } = useTranslation();
    const { fitView, getViewport, setCenter } = useReactFlow();
    const notes = useSelector((state: RootState) => state.quickNotes.active);
    const archived = useSelector((state: RootState) => state.quickNotes.archived);
    const ideas = useQuickNotes();

    const [status, setStatus] = useState<LoadStatus>("loading");
    const [reload, setReload] = useState(0);
    const [fitSignal, setFitSignal] = useState(0);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<DraftNote | null>(null);
    const [captureError, setCaptureError] = useState<ApiErrorPayload | null>(null);
    const [tidying, setTidying] = useState(false);
    const [converting, setConverting] = useState<QuickNote | null>(null);
    const [archivedOpen, setArchivedOpen] = useState(false);
    const [archivedFailed, setArchivedFailed] = useState(false);
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<QuickNote | null>(null);
    const [deletingBusy, setDeletingBusy] = useState(false);

    const captureRef = useRef<HTMLTextAreaElement>(null);
    const boardRef = useRef<HTMLDivElement>(null);
    const archivedToggleRef = useRef<HTMLButtonElement>(null);
    const panelId = useId();
    const deleteTitleId = useId();

    useEffect(() => {
        let active = true;
        setStatus("loading");
        void ideas.load().then((ok) => {
            if (!active) return;
            setStatus(ok ? "ready" : "error");
            if (ok) setFitSignal((n) => n + 1);
        });
        return () => {
            active = false;
        };
    }, [ideas, reload]);

    // Alt+N on this page goes to the field already here. Elsewhere QuickCaptureHub opens a dialog.
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (!isQuickCaptureShortcut(event) || isEditableTarget(event.target) || isModalOpen()) return;
            event.preventDefault();
            captureRef.current?.focus();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    const motion = () => (prefersReducedMotion() ? 0 : 300);

    /** Pans to a note when any part of it is outside the visible board, keeping the zoom. */
    const reveal = (note: QuickNote) => {
        const el = boardRef.current;
        if (!el) return;
        const { x, y, zoom } = getViewport();
        const left = note.x * zoom + x;
        const top = note.y * zoom + y;
        const inView =
            left >= 0 &&
            top >= 0 &&
            left + QUICK_NOTE_WIDTH * zoom <= el.clientWidth &&
            top + QUICK_NOTE_HEIGHT * zoom <= el.clientHeight;
        if (inView) return;
        void setCenter(note.x + QUICK_NOTE_WIDTH / 2, note.y + QUICK_NOTE_HEIGHT / 2, { zoom, duration: motion() });
    };

    const capture = async (text: string) => {
        setCaptureError(null);
        const response = await ideas.create({ text });
        if (response.success) {
            reveal(response.success);
            return true;
        }
        setCaptureError(response.error ?? { message: t("UnexpectedError") });
        return false;
    };

    // The board's note callbacks read the latest render through this ref, so the object handed
    // to every note stays the same and a memoised note does not redraw on each keystroke.
    const latest = useRef({ notes, draft, ideas, t });
    latest.current = { notes, draft, ideas, t };
    const find = (id: string) => latest.current.notes.find((n) => n.id === id);

    const actions = useMemo<NoteActions>(
        () => ({
            startEdit: (id) => {
                // An empty draft goes; one already being saved finishes on its own.
                setDraft((d) => (d?.savingText ? d : null));
                setEditingId(id);
            },
            cancelEdit: (id) => {
                if (id === null) setDraft(null);
                else setEditingId((current) => (current === id ? null : current));
            },
            saveText: (id, text) => {
                const value = text.trim();
                if (id === null) {
                    const current = latest.current.draft;
                    if (!current) return;
                    if (!value) {
                        setDraft(null);
                        return;
                    }
                    setDraft({ ...current, savingText: value, text: value });
                    void latest.current.ideas
                        .create({ text: value, color: current.color, x: current.x, y: current.y })
                        .then((response) => {
                            if (response.success) {
                                setDraft(null);
                                return;
                            }
                            // Back to the editor with the text, so a refused save loses nothing.
                            setDraft((d) => (d ? { ...d, savingText: null } : d));
                            toast.error(getFriendlyErrorMessage(latest.current.t, response.error));
                        });
                    return;
                }
                setEditingId((current) => (current === id ? null : current));
                const note = find(id);
                if (!note || !value || value === note.text) return;
                void latest.current.ideas.edit(note, { text: value, color: note.color });
            },
            setColor: (id, color) => {
                const note = find(id);
                if (note) void latest.current.ideas.edit(note, { text: note.text, color });
            },
            makeTask: (id) => {
                const note = find(id);
                if (note) setConverting(note);
            },
            archive: (id) => {
                const note = find(id);
                if (note) void latest.current.ideas.archive(note);
            },
        }),
        [],
    );

    const createAt = (at: { x: number; y: number }) => {
        // One draft at a time; the one being saved finishes first.
        if (draft?.savingText) return;
        setEditingId(null);
        setDraft({ x: clampCoord(at.x), y: clampCoord(at.y), color: "YELLOW", savingText: null, text: "" });
    };

    const tidy = async () => {
        if (tidying) return;
        setTidying(true);
        const ok = await ideas.tidy();
        setTidying(false);
        if (ok) setFitSignal((n) => n + 1);
    };

    const showAll = () => {
        void fitView({ ...FIT_OPTIONS, duration: motion() });
    };

    const loadArchived = async () => {
        setArchivedFailed(false);
        const ok = await ideas.loadArchived();
        if (!ok) setArchivedFailed(true);
    };

    const toggleArchived = () => {
        if (archivedOpen) {
            setArchivedOpen(false);
            return;
        }
        setArchivedOpen(true);
        // Read on every opening: the assistant or another tab may have archived something.
        void loadArchived();
    };

    const closeArchived = () => {
        setArchivedOpen(false);
        archivedToggleRef.current?.focus();
    };

    const restore = async (note: QuickNote) => {
        setRestoringId(note.id);
        const back = await ideas.restore(note);
        setRestoringId(null);
        if (back) reveal(back);
    };

    const confirmDelete = async () => {
        const note = deleting;
        if (!note || deletingBusy) return;
        setDeletingBusy(true);
        const ok = await ideas.remove(note);
        setDeletingBusy(false);
        if (ok) setDeleting(null);
    };

    const full = notes.length >= QUICK_NOTE_MAX_ACTIVE;
    const empty = status === "ready" && notes.length === 0 && draft === null;
    const prefill = useMemo(() => (converting ? quickNoteTaskPrefill(converting.text) : null), [converting]);

    const toolBase =
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-control border px-2.5 text-[13px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 md:px-3";
    const toolButton = `${toolBase} border-border bg-surface text-text-2 hover:bg-surface-2 hover:text-text`;

    return (
        <div className="flex h-[calc(100dvh-5rem)] min-h-[480px] w-full flex-col bg-bg px-4 pb-3 pt-6 text-text lg:h-[100dvh] lg:px-7 lg:pb-6">
            <PageHeader
                title={t("Ideas")}
                subtitle={t("IdeasSubtitle")}
                action={
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            data-testid="ideas-count"
                            className={`mr-1 font-mono text-[12px] ${full ? "font-semibold text-danger" : "text-text-3"}`}
                        >
                            {t("IdeasCount", { count: notes.length, max: QUICK_NOTE_MAX_ACTIVE })}
                        </span>
                        <button
                            type="button"
                            onClick={() => void tidy()}
                            disabled={tidying || notes.length === 0}
                            title={t("IdeasTidyHint")}
                            data-testid="ideas-tidy"
                            className={toolButton}
                        >
                            <LayoutGrid size={15} aria-hidden="true" />
                            <span className="sr-only md:not-sr-only">{t("IdeasTidy")}</span>
                        </button>
                        <button type="button" onClick={showAll} data-testid="ideas-fit" className={toolButton}>
                            <Scan size={15} aria-hidden="true" />
                            <span className="sr-only md:not-sr-only">{t("IdeasFit")}</span>
                        </button>
                        <button
                            ref={archivedToggleRef}
                            type="button"
                            onClick={toggleArchived}
                            aria-expanded={archivedOpen}
                            aria-controls={panelId}
                            data-testid="ideas-archived-toggle"
                            className={archivedOpen ? `${toolBase} border-accent/40 bg-accent-soft text-accent` : toolButton}
                        >
                            <Archive size={15} aria-hidden="true" />
                            <span className="sr-only md:not-sr-only">{t("IdeasArchived")}</span>
                        </button>
                    </div>
                }
            />

            {status === "error" && (
                <div
                    role="alert"
                    className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-card border border-danger/30 bg-danger/10 px-4 py-3 text-[13px] text-danger"
                    data-testid="ideas-load-error"
                >
                    <span>{t("IdeasLoadFailed")}</span>
                    <Button text={t("TryAgain")} mode="ghost" size="small" onClick={() => setReload((n) => n + 1)} />
                </div>
            )}

            <CaptureField
                ref={captureRef}
                id="ideas-capture"
                onSubmit={capture}
                error={captureError}
                onDismissError={() => setCaptureError(null)}
            />
            <p className="mt-1.5 hidden text-[11.5px] text-text-3 lg:block">{t("IdeasShortcutHint")}</p>

            <div
                ref={boardRef}
                data-testid="ideas-board"
                className="relative mt-3 min-h-[260px] flex-1 overflow-hidden rounded-card border border-border bg-surface"
            >
                <IdeasBoard
                    notes={notes}
                    editingId={editingId}
                    draft={draft}
                    actions={actions}
                    onMove={(moves) => void ideas.move(moves)}
                    onCreateAt={createAt}
                    fitSignal={fitSignal}
                    ariaLabel={t("IdeasBoardLabel")}
                />

                {empty && (
                    // Lets double-clicks through to the board under it.
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6" data-testid="ideas-empty">
                        <div className="max-w-sm text-center">
                            <span
                                aria-hidden="true"
                                className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-control bg-accent-soft text-accent"
                            >
                                <StickyNote size={20} />
                            </span>
                            <p className="text-[15px] font-semibold text-text">{t("IdeasEmptyTitle")}</p>
                            <p className="mt-1.5 text-[12.5px] leading-snug text-text-2">{t("IdeasEmptyBody")}</p>
                            <p className="mt-2 text-[12px] text-text-3">{t("IdeasEmptyHintWeb")}</p>
                        </div>
                    </div>
                )}

                {status === "loading" && notes.length === 0 && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-busy="true">
                        <span className="inline-block h-7 w-7 animate-spin rounded-full border-4 border-border border-t-transparent" />
                    </div>
                )}

                <ArchivedPanel
                    id={panelId}
                    open={archivedOpen}
                    notes={archived}
                    onClose={closeArchived}
                    onRestore={(note) => void restore(note)}
                    onDelete={setDeleting}
                    busyId={restoringId}
                    failed={archivedFailed}
                    onRetry={() => void loadArchived()}
                />
            </div>

            <Modal
                isOpen={converting !== null}
                onClose={() => setConverting(null)}
                labelledBy={TASK_FORM_TITLE_ID}
                className="max-w-xl"
            >
                {converting && prefill && (
                    <TaskForm
                        key={converting.id}
                        mode="create"
                        title={t("IdeasMakeTaskTitle")}
                        initialValues={prefill}
                        onCreate={(values) => ideas.convert(converting, values)}
                        createdMessage={t("IdeasConvertedToast")}
                        onClose={() => setConverting(null)}
                    />
                )}
            </Modal>

            <Modal
                isOpen={deleting !== null}
                onClose={() => setDeleting(null)}
                labelledBy={deleteTitleId}
                className="max-w-md"
            >
                <h2 id={deleteTitleId} className="text-[15px] font-semibold tracking-[-0.01em] text-text">
                    {t("IdeasDeleteConfirm")}
                </h2>
                {deleting && (
                    <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap break-words text-[12.5px] leading-snug text-text-2">
                        {deleting.text}
                    </p>
                )}
                <div className="mt-4 flex justify-end gap-2">
                    <Button text={t("Cancel")} mode="ghost" size="medium" type="button" onClick={() => setDeleting(null)} />
                    <Button
                        text={t("IdeasDeleteForever")}
                        mode="danger"
                        size="medium"
                        type="button"
                        onClick={() => void confirmDelete()}
                        disabled={deletingBusy}
                        testId="ideas-delete-confirm"
                    />
                </div>
            </Modal>
        </div>
    );
}
