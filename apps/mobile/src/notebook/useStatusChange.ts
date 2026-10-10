import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useStore } from 'react-redux';
import { setPageStatus } from '@beyou/api/notebook';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { notebookStatusesChanged } from '@beyou/state';
import { applyRefreshUi } from '@beyou/state/user/refreshUiThunk';
import type { StatusChange, StatusChoice } from '@beyou/types/notebook/notebook';
import { notify } from '../notify';
import type { AppDispatch, RootState } from '../store';

/**
 * A status picked on the phone, for a page screen or a node on a roadmap: sent, fanned out to
 * every place the store shows the pages it moved, and paid. Answers the change, or null when the
 * server refused it (the error is already on screen).
 */
export function useStatusChange() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();

  return useCallback(
    async (pageId: string, choice: StatusChoice): Promise<StatusChange | null> => {
      const response = await setPageStatus(pageId, choice, t);
      if (!response.success) {
        notify.error(getFriendlyErrorMessage(t, response.error));
        return null;
      }
      const change = response.success;
      dispatch(notebookStatusesChanged(change.changed));
      if (change.refreshUi) {
        const prev = store.getState().perfil;
        applyRefreshUi(change.refreshUi, dispatch, { level: prev.level, constance: prev.constance });
      }
      if (change.xpEarned > 0) {
        notify.success(t('NotebookMobilePageDone'), {
          subtitle: t('NotebookMobileXpEarned', { xp: Math.round(change.xpEarned) }),
        });
      }
      return change;
    },
    [dispatch, store, t],
  );
}
