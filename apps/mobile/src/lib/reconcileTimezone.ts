import type { Dispatch, UnknownAction } from '@reduxjs/toolkit';
import type { UserType } from '@beyou/types/user/UserType';
import { getLogger } from '@beyou/api';
import editUser from '@beyou/api/user/editUser';
import { timezoneEnter, timezoneSourceEnter } from '@beyou/state/user/perfilSlice';
import { detectTimezone } from './detectTimezone';

/**
 * Adopts the device's timezone for an account that has never had one, once.
 *
 * The mobile twin of `apps/web/src/services/user/reconcileTimezone.ts`. Deliberately a
 * second copy rather than a shared module: the two differ only in the detection
 * primitive, and hoisting the rest into `@beyou/state` would drag an `expo-localization`
 * import into a package the web app builds. Keep the guard order identical.
 *
 * Adopts only while `timezoneSource` is `DEFAULT`. `DETECTED` means a client already
 * answered and re-adopting would move a travelling user's day boundary under them;
 * `EXPLICIT` means a person chose it. The backend enforces the same rule, so a bug here
 * cannot overwrite a real answer.
 *
 * Failure is swallowed. This runs while the dashboard is loading and must never be the
 * reason that fails.
 */
export async function reconcileTimezone(
  dispatch: Dispatch<UnknownAction>,
  profile: UserType,
): Promise<void> {
  if (profile?.timezoneSource !== 'DEFAULT') return;

  const detected = detectTimezone();
  if (!detected || detected === profile.timezone) return;

  try {
    const response = await editUser({ timezone: detected, timezoneSource: 'DETECTED' });
    if (response?.error) {
      getLogger().error('Timezone reconcile rejected', response.error);
      return;
    }
    dispatch(timezoneEnter(detected));
    dispatch(timezoneSourceEnter('DETECTED'));
  } catch (e) {
    getLogger().error('Timezone reconcile failed', e);
  }
}
