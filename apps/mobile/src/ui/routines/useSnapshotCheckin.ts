import { useCallback } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { checkSnapshotItem, skipSnapshotItem, getSnapshot } from '@beyou/api/routine/snapshot';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { applyRefreshUi } from '@beyou/state/user/refreshUiThunk';
import { enterSnapshot } from '@beyou/state';
import type { Snapshot } from '@beyou/types/routine/snapshot';
import type { RefreshUI } from '@beyou/types/refreshUi/refreshUi.type';
import { notify } from '../../notify';
import type { AppDispatch, RootState } from '../../store';

export function useSnapshotCheckin(routineId: string) {
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const { t } = useTranslation();

  const after = useCallback(
    async (refresh: RefreshUI, snapshot: Snapshot) => {
      const prev = store.getState().perfil;
      applyRefreshUi(refresh, dispatch, { level: prev.level, constance: prev.constance });
      const res = await getSnapshot(routineId, snapshot.snapshotDate, t);
      if (res.success) dispatch(enterSnapshot(res.success));
    },
    [dispatch, store, routineId, t],
  );

  const check = useCallback(
    async (snapshot: Snapshot, checkId: string) => {
      const res = await checkSnapshotItem(snapshot.id, checkId, t);
      if (res.success) { await after(res.success, snapshot); return; }
      notify.error(getFriendlyErrorMessage(t, res.error));
    },
    [after, t],
  );

  const skip = useCallback(
    async (snapshot: Snapshot, checkId: string) => {
      const res = await skipSnapshotItem(snapshot.id, checkId, t);
      if (res.success) { await after(res.success, snapshot); return; }
      notify.error(getFriendlyErrorMessage(t, res.error));
    },
    [after, t],
  );

  return { check, skip };
}
