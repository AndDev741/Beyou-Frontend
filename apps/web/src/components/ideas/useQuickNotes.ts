import { useMemo, useRef } from "react";
import { useDispatch, useStore } from "react-redux";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
    archiveQuickNote,
    convertQuickNoteToTask,
    createQuickNote,
    deleteQuickNote,
    editQuickNote,
    getArchivedQuickNotes,
    getQuickNotes,
    restoreQuickNote,
    saveQuickNoteLayout,
    tidyQuickNotes,
    type QuickNoteTaskInput,
} from "@beyou/api/quickNote/quickNoteApi";
import { getFriendlyErrorMessage, type ApiErrorPayload } from "@beyou/api/apiError";
import {
    archivedQuickNotesLoaded,
    dropPosition,
    quickNoteRemoved,
    quickNotesLoaded,
    quickNotesMoved,
    quickNoteUpserted,
    refreshQuickNotes,
} from "@beyou/state";
import type { RootState } from "@beyou/state/rootReducer";
import type {
    QuickNote,
    QuickNoteCreateInput,
    QuickNoteEditInput,
    QuickNotePosition,
    QuickNoteTaskConversion,
} from "@beyou/types/quickNote/quickNote";

type Result<T> = { success?: T; error?: ApiErrorPayload };

/** The note is gone: deleted on another device, or never this account's. */
const isGone = (error?: ApiErrorPayload) => error?.errorKey === "QUICK_NOTE_NOT_FOUND";

/**
 * Every write the Ideas board makes, each landing in the `quickNotes` slice from the server's
 * answer.
 *
 * Two writes go first and are saved after: a move, so a dropped note stays where it was dropped
 * while the save is in flight, and an edit, so the new text shows the moment the editor closes.
 * Either one failing re-reads the board, because after a refused save nobody can say for sure
 * what the server holds.
 */
export function useQuickNotes() {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const store = useStore();
    const tRef = useRef(t);
    tRef.current = t;

    /** Each layout save, numbered: only the latest one's answer is drawn. */
    const saveSeq = useRef(0);

    return useMemo(() => {
        const state = () => (store.getState() as RootState).quickNotes;
        const tr = () => tRef.current;

        const resync = () => refreshQuickNotes(dispatch, state(), tr());

        const fail = (error?: ApiErrorPayload) => {
            toast.error(getFriendlyErrorMessage(tr(), error));
            if (isGone(error)) void resync();
        };

        return {
            resync,

            /** The board, for the page's first draw. False when it could not be read. */
            async load(): Promise<boolean> {
                const response = await getQuickNotes(tr());
                if (!response.success) return false;
                dispatch(quickNotesLoaded(response.success));
                return true;
            },

            /** Without `x` and `y` the server drops it in the board's first free cell. */
            async create(input: QuickNoteCreateInput): Promise<Result<QuickNote>> {
                const response = await createQuickNote(input, tr());
                if (response.success) dispatch(quickNoteUpserted(response.success));
                return response;
            },

            async edit(note: QuickNote, input: QuickNoteEditInput): Promise<boolean> {
                dispatch(quickNoteUpserted({ ...note, ...input }));
                const response = await editQuickNote(note.id, input, tr());
                if (response.success) {
                    dispatch(quickNoteUpserted(response.success));
                    return true;
                }
                // A note that is gone is not put back; the re-read in `fail` takes it away.
                if (!isGone(response.error)) dispatch(quickNoteUpserted(note));
                fail(response.error);
                return false;
            },

            /**
             * Notes dropped on the board. Each comes to the front in the order given, so a group
             * dragged together keeps its own stacking above everything else.
             */
            async move(moves: { id: string; x: number; y: number }[]): Promise<void> {
                let notes = state().active;
                const positions: QuickNotePosition[] = [];
                for (const move of moves) {
                    const position = dropPosition(notes, move.id, move);
                    positions.push(position);
                    notes = notes.map((n) => (n.id === position.id ? { ...n, ...position } : n));
                }
                if (positions.length === 0) return;
                dispatch(quickNotesMoved(positions));
                const seq = ++saveSeq.current;
                const response = await saveQuickNoteLayout(positions, tr());
                if (response.success) {
                    // An older answer would put a note dropped since then back where it was.
                    if (seq === saveSeq.current) dispatch(quickNotesLoaded(response.success));
                    return;
                }
                toast.error(getFriendlyErrorMessage(tr(), response.error));
                await resync();
            },

            async tidy(): Promise<boolean> {
                const response = await tidyQuickNotes(tr());
                if (response.success) {
                    dispatch(quickNotesLoaded(response.success));
                    return true;
                }
                fail(response.error);
                return false;
            },

            async archive(note: QuickNote): Promise<boolean> {
                const response = await archiveQuickNote(note.id, tr());
                if (response.success) {
                    dispatch(quickNoteUpserted(response.success));
                    toast.success(tr()("IdeasArchivedToast"));
                    return true;
                }
                fail(response.error);
                return false;
            },

            async loadArchived(): Promise<boolean> {
                const response = await getArchivedQuickNotes(tr());
                if (response.success) {
                    dispatch(archivedQuickNotesLoaded(response.success));
                    return true;
                }
                fail(response.error);
                return false;
            },

            /** Refused while the board is full, with the limit message. Answers the note back on the board. */
            async restore(note: QuickNote): Promise<QuickNote | null> {
                const response = await restoreQuickNote(note.id, tr());
                if (response.success) {
                    dispatch(quickNoteUpserted(response.success));
                    toast.success(tr()("IdeasRestoredToast"));
                    return response.success;
                }
                fail(response.error);
                return null;
            },

            async remove(note: QuickNote): Promise<boolean> {
                const response = await deleteQuickNote(note.id, tr());
                // Already deleted elsewhere is still deleted.
                if (response.success || isGone(response.error)) {
                    dispatch(quickNoteRemoved(note.id));
                    return true;
                }
                fail(response.error);
                return false;
            },

            /**
             * The task form's submit when it was opened from a note. The server creates the task
             * and archives the note in one go; the form refreshes the task list and says so.
             */
            async convert(note: QuickNote, values: QuickNoteTaskInput): Promise<Result<QuickNoteTaskConversion>> {
                const response = await convertQuickNoteToTask(note.id, values, tr());
                if (response.success) {
                    dispatch(quickNoteUpserted(response.success.note));
                } else if (isGone(response.error) || response.error?.errorKey === "QUICK_NOTE_ALREADY_CONVERTED") {
                    // Converted or deleted from another tab: the board here is behind.
                    void resync();
                }
                return response;
            },
        };
    }, [dispatch, store]);
}

export type QuickNotesApi = ReturnType<typeof useQuickNotes>;
