import type { TFunction } from 'i18next';
import type { Dispatch } from '@reduxjs/toolkit';
import { getArchivedQuickNotes, getQuickNotes } from '@beyou/api/quickNote/quickNoteApi';
import { archivedQuickNotesLoaded, quickNotesLoaded, type QuickNotesState } from './quickNotesSlice';

/**
 * Re-reads the board, and the archived list too when it was already open.
 *
 * Called on the page's mount and by the assistant refresher when a tool reports the `quickNotes`
 * domain, so a note the chat wrote shows up on a board that is open beside it.
 */
export async function refreshQuickNotes(
    dispatch: Dispatch,
    quickNotes: Pick<QuickNotesState, 'archived'>,
    t: TFunction,
): Promise<void> {
    const [active, archived] = await Promise.all([
        getQuickNotes(t),
        quickNotes.archived ? getArchivedQuickNotes(t) : Promise.resolve(null),
    ]);
    if (active.success) dispatch(quickNotesLoaded(active.success));
    if (archived?.success) dispatch(archivedQuickNotesLoaded(archived.success));
}
