import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
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
} from '@beyou/api/quickNote/quickNoteApi';
import { getFriendlyErrorMessage, type ApiErrorPayload } from '@beyou/api/apiError';
import getTasks from '@beyou/api/tasks/getTasks';
import {
  archivedQuickNotesLoaded,
  dropPosition,
  quickNoteRemoved,
  quickNotesLoaded,
  quickNotesMoved,
  quickNoteUpserted,
} from '@beyou/state';
import { enterTasks } from '@beyou/state/task/tasksSlice';
import type { QuickNote, QuickNoteColor } from '@beyou/types/quickNote/quickNote';
import type { task } from '@beyou/types/tasks/taskType';
import { notify } from '../notify';
import type { AppDispatch, RootState } from '../store';

/** The server says the note is not there (deleted on another device, or never this account's). */
export const isQuickNoteGone = (error?: ApiErrorPayload) => error?.errorKey === 'QUICK_NOTE_NOT_FOUND';

/**
 * The Ideas board's reads and writes on the phone, over the shared `quickNotes` slice.
 *
 * Every write lands in the slice from the server's answer, except a drop, which moves the note at
 * once (`quickNotesMoved`) and only goes back to the server's board if the save fails. Failures
 * come out as toasts through `getFriendlyErrorMessage`, so `QUICK_NOTE_LIMIT_REACHED` reads as
 * "The board is full…", not as an enum. A note that turns out to be gone leaves the board.
 *
 * Each write resolves to what happened, so the sheets know whether to close.
 */
export function useQuickNotes() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { active, archived, loaded } = useSelector((state: RootState) => state.quickNotes);
  const [loadError, setLoadError] = useState<string | null>(null);

  const activeRef = useRef(active);
  activeRef.current = active;

  const fail = useCallback((error?: ApiErrorPayload) => notify.error(getFriendlyErrorMessage(t, error)), [t]);

  const reload = useCallback(async () => {
    const response = await getQuickNotes(t);
    if (response.success) {
      dispatch(quickNotesLoaded(response.success));
      setLoadError(null);
      return;
    }
    setLoadError(getFriendlyErrorMessage(t, response.error));
  }, [dispatch, t]);

  /** The note left the server: drop it here and say so. */
  const gone = useCallback(
    (id: string) => {
      dispatch(quickNoteRemoved(id));
      notify.info(t('QUICK_NOTE_NOT_FOUND'));
    },
    [dispatch, t],
  );

  const create = useCallback(
    async (text: string): Promise<QuickNote | null> => {
      const response = await createQuickNote({ text }, t);
      if (!response.success) {
        fail(response.error);
        return null;
      }
      dispatch(quickNoteUpserted(response.success));
      return response.success;
    },
    [dispatch, fail, t],
  );

  /**
   * Where a dragged note was let go. Applied right away and saved behind it; the server keeps
   * exactly what was sent, so a success needs no second dispatch. A failure re-reads the board,
   * which puts the note back where the server has it.
   */
  const drop = useCallback(
    async (id: string, at: { x: number; y: number }) => {
      const position = dropPosition(activeRef.current, id, at);
      dispatch(quickNotesMoved([position]));
      const response = await saveQuickNoteLayout([position], t);
      if (response.success) return;
      fail(response.error);
      await reload();
    },
    [dispatch, fail, reload, t],
  );

  /** Resolves to the tidied board, or null when the server refused. */
  const tidy = useCallback(async (): Promise<QuickNote[] | null> => {
    const response = await tidyQuickNotes(t);
    if (!response.success) {
      fail(response.error);
      return null;
    }
    dispatch(quickNotesLoaded(response.success));
    return response.success;
  }, [dispatch, fail, t]);

  const edit = useCallback(
    async (id: string, text: string, color: QuickNoteColor): Promise<boolean> => {
      const response = await editQuickNote(id, { text, color }, t);
      if (isQuickNoteGone(response.error)) {
        gone(id);
        return true;
      }
      if (!response.success) {
        fail(response.error);
        return false;
      }
      dispatch(quickNoteUpserted(response.success));
      return true;
    },
    [dispatch, fail, gone, t],
  );

  const archive = useCallback(
    async (id: string): Promise<boolean> => {
      const response = await archiveQuickNote(id, t);
      if (isQuickNoteGone(response.error)) {
        gone(id);
        return true;
      }
      if (!response.success) {
        fail(response.error);
        return false;
      }
      dispatch(quickNoteUpserted(response.success));
      notify.success(t('IdeasArchivedToast'));
      return true;
    },
    [dispatch, fail, gone, t],
  );

  const loadArchived = useCallback(async () => {
    const response = await getArchivedQuickNotes(t);
    if (response.success) dispatch(archivedQuickNotesLoaded(response.success));
    else fail(response.error);
  }, [dispatch, fail, t]);

  const restore = useCallback(
    async (id: string): Promise<boolean> => {
      const response = await restoreQuickNote(id, t);
      if (isQuickNoteGone(response.error)) {
        gone(id);
        return false;
      }
      if (!response.success) {
        fail(response.error);
        return false;
      }
      dispatch(quickNoteUpserted(response.success));
      notify.success(t('IdeasRestoredToast'));
      return true;
    },
    [dispatch, fail, gone, t],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      const response = await deleteQuickNote(id, t);
      if (response.error && !isQuickNoteGone(response.error)) {
        fail(response.error);
        return false;
      }
      // Gone already is what a delete wanted.
      dispatch(quickNoteRemoved(id));
      notify.success(t('deleted successfully'));
      return true;
    },
    [dispatch, fail, t],
  );

  /**
   * "Make it a task" through the task form. The server creates the task and archives the note in
   * one go; the form shows the toasts. Tasks are re-read so the tasks screen and today's pickers
   * have the new one. Already converted, or gone: the board re-reads, since the note it shows is
   * not on the server's board any more.
   */
  const convert = useCallback(
    async (id: string, input: QuickNoteTaskInput) => {
      const response = await convertQuickNoteToTask(id, input, t);
      if (response.success) {
        dispatch(quickNoteUpserted(response.success.note));
        void getTasks(t).then((tasks) => {
          if (tasks.success) dispatch(enterTasks(tasks.success as task[]));
        });
      } else if (
        response.error?.errorKey === 'QUICK_NOTE_ALREADY_CONVERTED' ||
        isQuickNoteGone(response.error)
      ) {
        void reload();
      }
      return response;
    },
    [dispatch, reload, t],
  );

  return {
    active,
    archived,
    loaded,
    loadError,
    reload,
    create,
    drop,
    tidy,
    edit,
    archive,
    loadArchived,
    restore,
    remove,
    convert,
  };
}
