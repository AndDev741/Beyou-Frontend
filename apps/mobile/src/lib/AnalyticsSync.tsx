import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { getAnalytics, personPropertiesFromProfile } from '@beyou/api';
import type { ProfileForAnalytics } from '@beyou/api';
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
 * The traits alongside it are the account-shape person properties the engagement
 * work cohorts on, built by `personPropertiesFromProfile` in @beyou/api so this
 * and web's hydratePerfil report the same names off the same response.
 *
 * Reset fires on the authenticated → unauthenticated transition (logout, or a
 * dead refresh token discovered at boot), so the next account on this device
 * is not merged into the departed one. The ref tracks the previous status
 * because resetting on every render of an unauthenticated app would wipe the
 * anonymous id on each launch of the login screen.
 */
export default function AnalyticsSync() {
  const profile = useSelector(
    (s: RootState) => s.auth.profile as (ProfileForAnalytics & { id?: string; name?: string }) | null,
  );
  const userId = profile?.id;
  const status = useSelector((s: RootState) => s.auth.status);
  const wasAuthenticated = useRef(false);

  // Serialised so the effect re-runs when a property actually moves — a check-in that
  // changes the streak has to reach the person profile, but re-identifying on every
  // render of an unchanged profile is a request per render. Selecting the object itself
  // is safe here because `auth.profile` is replaced, not mutated, on every load.
  const properties = profile ? personPropertiesFromProfile(profile, profile.name) : null;
  const propertiesKey = properties ? JSON.stringify(properties) : null;

  useEffect(() => {
    if (userId && propertiesKey) getAnalytics().identify(userId, JSON.parse(propertiesKey));
  }, [userId, propertiesKey]);

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
