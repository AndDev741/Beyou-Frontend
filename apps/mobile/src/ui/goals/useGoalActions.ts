import { useCallback } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { useTranslation } from 'react-i18next';
import increaseCurrentValue from '@beyou/api/goals/increaseCurrentValue';
import decreaseCurrentValue from '@beyou/api/goals/decreaseCurrentValue';
import markGoalAsComplete from '@beyou/api/goals/markGoalAsComplete';
import { updateGoal } from '@beyou/state/goal/goalsSlice';
import { applyRefreshUi } from '@beyou/state/user/refreshUiThunk';
import { notify } from '../../notify';
import type { AppDispatch, RootState } from '../../store';

/**
 * Goal progress actions. increase/decrease bump currentValue by 1 and return the
 * updated goal (no XP) → patched straight into the slice. complete awards XP and
 * returns a RefreshUI → piped through the shared applyRefreshUi (perfil + categories).
 */
export function useGoalActions() {
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const { t } = useTranslation();

  const increase = useCallback(async (id: string) => {
    try {
      dispatch(updateGoal(await increaseCurrentValue(id, t)));
      return true;
    } catch {
      notify.error(t('UnexpectedError'));
      return false;
    }
  }, [dispatch, t]);

  const decrease = useCallback(async (id: string) => {
    try {
      dispatch(updateGoal(await decreaseCurrentValue(id, t)));
      return true;
    } catch {
      notify.error(t('UnexpectedError'));
      return false;
    }
  }, [dispatch, t]);

  const complete = useCallback(async (id: string) => {
    const res = await markGoalAsComplete(id, t);
    if (res.error) {
      notify.error(res.error);
      return false;
    }
    if (res.success) {
      const prev = store.getState().perfil;
      applyRefreshUi(res.success, dispatch, { level: prev.level, constance: prev.constance });
    }
    notify.success(t('Completed'));
    return true;
  }, [dispatch, store, t]);

  return { increase, decrease, complete };
}
