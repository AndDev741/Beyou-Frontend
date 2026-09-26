import { useCallback } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { useTranslation } from 'react-i18next';
import increaseCurrentValue from '@beyou/api/goals/increaseCurrentValue';
import decreaseCurrentValue from '@beyou/api/goals/decreaseCurrentValue';
import markGoalAsComplete from '@beyou/api/goals/markGoalAsComplete';
import archiveGoal from '@beyou/api/goals/archiveGoal';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { updateGoal } from '@beyou/state/goal/goalsSlice';
import { applyRefreshUi } from '@beyou/state/user/refreshUiThunk';
import { notify } from '../../notify';
import type { AppDispatch, RootState } from '../../store';

/**
 * Goal progress actions. increase/decrease move currentValue by `amount` (1 from
 * the card's +/-, whatever the user typed from the progress modal) and return the
 * updated goal (no XP) → patched straight into the slice. complete awards XP and
 * returns a RefreshUI → piped through the shared applyRefreshUi (perfil + categories).
 */
export function useGoalActions() {
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const { t } = useTranslation();

  const increase = useCallback(async (id: string, amount = 1) => {
    try {
      dispatch(updateGoal(await increaseCurrentValue(id, t, amount)));
      return true;
    } catch {
      notify.error(t('UnexpectedError'));
      return false;
    }
  }, [dispatch, t]);

  const decrease = useCallback(async (id: string, amount = 1) => {
    try {
      dispatch(updateGoal(await decreaseCurrentValue(id, t, amount)));
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

  /**
   * Archive or restore. The server answers with every goal that changed (the sub-goals archived
   * along with it too); each is patched into the slice as it came back, so the screen is right
   * without a refetch. The toast names the sub-goals, or they would seem to vanish.
   */
  const setArchived = useCallback(async (id: string, archived: boolean) => {
    const res = await archiveGoal(id, archived, t);
    if (res.error || !res.success) {
      if (res.error) notify.error(getFriendlyErrorMessage(t, res.error));
      return false;
    }
    res.success.forEach((changed) => dispatch(updateGoal(changed)));
    const alongWith = res.success.length - 1;
    if (!archived) notify.success(t('GoalRestored'));
    else if (alongWith > 0) notify.success(t('GoalArchivedWithSubGoals', { count: alongWith }));
    else notify.success(t('GoalArchived'));
    return true;
  }, [dispatch, t]);

  return { increase, decrease, complete, setArchived };
}
