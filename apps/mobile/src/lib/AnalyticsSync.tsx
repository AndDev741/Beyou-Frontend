import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { getAnalytics } from '@beyou/api';
import type { RootState } from '../store';

/**
 * Ties the analytics identity to the auth lifecycle, the same way ThemeSync
 * ties the theme to the loaded profile: one component watching the store, so
 * no login/bootstrap/profile-refresh path has to remember to call identify —
 * they all land in `auth.profile` and this reacts.
 *
 * Identity is the account's opaque UUID (`profile.id`) plus the display name
 * (a deliberate exception so person profiles are recognizable in PostHog) —
 * never the email, the same rule as web's hydratePerfil. A backend built
 * before UserResponseDTO.id simply omits the id and the session stays
 * anonymous.
 *
 * Reset fires on the authenticated → unauthenticated transition (logout, or a
 * dead refresh token discovered at boot), so the next account on this device
 * is not merged into the departed one. The ref tracks the previous status
 * because resetting on every render of an unauthenticated app would wipe the
 * anonymous id on each launch of the login screen.
 */
export default function AnalyticsSync() {
  const userId = useSelector(
    (s: RootState) => (s.auth.profile as { id?: string } | null)?.id,
  );
  const userName = useSelector(
    (s: RootState) => (s.auth.profile as { name?: string } | null)?.name,
  );
  const status = useSelector((s: RootState) => s.auth.status);
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    if (userId) getAnalytics().identify(userId, userName ? { name: userName } : undefined);
  }, [userId, userName]);

  useEffect(() => {
    if (status === 'authenticated') {
      wasAuthenticated.current = true;
    } else if (status === 'unauthenticated' && wasAuthenticated.current) {
      wasAuthenticated.current = false;
      getAnalytics().reset();
    }
  }, [status]);

  return null;
}
