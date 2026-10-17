import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { QuickNote, QuickNotePosition } from '@beyou/types/quickNote/quickNote';
import { byStackOrder } from './quickNoteHelpers';

/**
 * The Ideas board. `active` is what sits on the board, back to front; `archived` is the list
 * taken off it, null until someone opens it (most visits never do, so it is not fetched up front).
 *
 * NOTE: notes are whatever crossed someone's mind, which is personal enough to keep off disk. The
 * slice is on the web persist blacklist and mobile redux is in-memory.
 */
export type QuickNotesState = {
    active: QuickNote[];
    archived: QuickNote[] | null;
    /** False until the first fetch lands, so a page can tell "empty board" from "not loaded". */
    loaded: boolean;
};

const initialState: QuickNotesState = { active: [], archived: null, loaded: false };

const withoutId = (notes: QuickNote[], id: string) => notes.filter((n) => n.id !== id);

const quickNotesSlice = createSlice({
    name: 'quickNotes',
    initialState,
    reducers: {
        /** The board as the server answered it (a fetch, a layout save or a tidy). */
        quickNotesLoaded(state, action: PayloadAction<QuickNote[]>) {
            state.active = [...action.payload].sort(byStackOrder);
            state.loaded = true;
        },
        archivedQuickNotesLoaded(state, action: PayloadAction<QuickNote[]>) {
            state.archived = action.payload;
        },
        /**
         * One note after a write. Where it goes follows `archivedAt`, so an archive, a restore and
         * a conversion all land in the right list with the same action.
         */
        quickNoteUpserted(state, action: PayloadAction<QuickNote>) {
            const note = action.payload;
            state.active = withoutId(state.active, note.id);
            if (state.archived) state.archived = withoutId(state.archived, note.id);
            if (note.archivedAt) {
                if (state.archived) state.archived = [note, ...state.archived];
            } else {
                state.active = [...state.active, note].sort(byStackOrder);
            }
        },
        quickNoteRemoved(state, action: PayloadAction<string>) {
            state.active = withoutId(state.active, action.payload);
            if (state.archived) state.archived = withoutId(state.archived, action.payload);
        },
        /**
         * Positions applied before the server answers, so a dropped note stays where it was
         * dropped instead of jumping back while the save is in flight.
         */
        quickNotesMoved(state, action: PayloadAction<QuickNotePosition[]>) {
            const byId = new Map(action.payload.map((p) => [p.id, p]));
            state.active = state.active
                .map((note) => {
                    const moved = byId.get(note.id);
                    return moved ? { ...note, x: moved.x, y: moved.y, z: moved.z } : note;
                })
                .sort(byStackOrder);
        },
    },
});

export const {
    quickNotesLoaded,
    archivedQuickNotesLoaded,
    quickNoteUpserted,
    quickNoteRemoved,
    quickNotesMoved,
} = quickNotesSlice.actions;
export default quickNotesSlice.reducer;
