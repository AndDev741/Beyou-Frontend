import type { TFunction } from 'i18next';
import editUser from '@beyou/api/user/editUser';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { tutorialCompletedEnter } from '@beyou/state/user/perfilSlice';
import type { AppDispatch } from '../store';
import { setPhase } from './tutorialSlice';
import { saveTutorialPhase } from '../lib/tutorialStore';
import { notify } from '../notify';

export async function completeTutorial({ dispatch, t }: { dispatch: AppDispatch; t: TFunction }): Promise<boolean> {
  const res = await editUser({ isTutorialCompleted: true });
  if (res.error) {
    notify.error(getFriendlyErrorMessage(t, res.error));
    return false;
  }
  dispatch(tutorialCompletedEnter(true));
  dispatch(setPhase(null));
  await saveTutorialPhase(null);
  return true;
}
