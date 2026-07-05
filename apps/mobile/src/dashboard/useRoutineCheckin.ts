import { useCallback } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { useTranslation } from 'react-i18next';
import checkRoutine from '@beyou/api/routine/checkItem';
import skipRoutine from '@beyou/api/routine/skipItem';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { applyRefreshUi } from '@beyou/state/user/refreshUiThunk';
import type { itemGroupToCheck } from '@beyou/types/routine/itemGroupToCheck';
import type { itemGroupToSkip } from '@beyou/types/routine/itemGroupToSkip';
import type { RefreshUI } from '@beyou/types/refreshUi/refreshUi.type';
import { notify } from '../notify';
import { isOffline } from '../offline/mutations';
import { checkItemOffline, skipItemOffline } from '../offline/ops/checkinOps';
import type { AppDispatch, RootState } from '../store';

interface CheckOpts {
  wasChecked: boolean;
  motivationalPhrase?: string;
}

/**
 * Check / skip a routine item group. Mirrors the web routineSection handlers:
 * call the API, then apply the returned RefreshUI through the shared
 * applyRefreshUi (perfil + categories + item group + celebrations). `previous`
 * perfil is read from the store right before applying so the celebration diff is
 * correct. Returns the RefreshUI (so callers can drive the XP float) or null.
 */
export function useRoutineCheckin() {
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const { t } = useTranslation();

  const apply = useCallback(
    (refresh: RefreshUI) => {
      const prev = store.getState().perfil;
      applyRefreshUi(refresh, dispatch, { level: prev.level, constance: prev.constance });
    },
    [dispatch, store],
  );

  const check = useCallback(
    async (dto: itemGroupToCheck, opts: CheckOpts): Promise<RefreshUI | null> => {
      if (isOffline()) {
        const groupItemId = dto.habitGroupDTO?.habitGroupId ?? dto.taskGroupDTO?.taskGroupId ?? '';
        await checkItemOffline(dto, groupItemId, !opts.wasChecked);
        return null;
      }
      const res = await checkRoutine(dto, t);
      if (res.success) {
        apply(res.success);
        if (!opts.wasChecked) notify.success(opts.motivationalPhrase || t('Item completed'));
        return res.success;
      }
      notify.error(getFriendlyErrorMessage(t, res.error));
      return null;
    },
    [apply, t],
  );

  const skip = useCallback(
    async (dto: itemGroupToSkip): Promise<RefreshUI | null> => {
      if (isOffline()) {
        const groupItemId = dto.habitGroupDTO?.habitGroupId ?? dto.taskGroupDTO?.taskGroupId ?? '';
        await skipItemOffline(dto, groupItemId, dto.skip);
        return null;
      }
      const res = await skipRoutine(dto, t);
      if (res.success) {
        apply(res.success);
        return res.success;
      }
      notify.error(getFriendlyErrorMessage(t, res.error));
      return null;
    },
    [apply, t],
  );

  return { check, skip };
}
