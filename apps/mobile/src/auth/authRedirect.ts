import type { AiConsent } from '@beyou/types/user/UserType';
import type { AuthStatus } from './types';

export type RedirectTarget = '/(app)' | '/(auth)/login' | '/ai-consent';

/**
 * Pure redirect decision for the root-layout Gate.
 *
 * Expo Router route groups are URL-transparent (filtered from the pathname) but
 * ARE preserved in `useSegments()`. The dashboard at `(app)/index.tsx` serves
 * the root path `/`, and at that route `useSegments()` returns `['(app)']` — NOT
 * `[]` — so we key off the first segment:
 *   - authenticated while inside the `(auth)` group  → go to the app
 *   - unauthenticated while NOT inside `(auth)`       → go to login
 *
 * An authenticated user landing on `/` (segments `['(app)']`) is already on the
 * dashboard, so no redirect is returned — and an unauthenticated user sitting on
 * a `(auth)` screen returns null too, which prevents a redirect loop.
 *
 * Returns null when no navigation is needed (already in the right place, or the
 * auth status is still resolving).
 *
 * `aiConsent` is the signed-in account's answer about the AI provider. While it is
 * `UNASKED` an authenticated user goes to `/ai-consent` before anything else, so no AI
 * feature (the daily briefing included) can run before the person answers (App Store
 * guideline 5.1.2(i)). The screen stays reachable afterwards (Configuration and the
 * assistant send people there to change their answer), so nothing pushes them off it.
 * Undefined means an older backend that does not know the field: nothing is asked.
 */
export function nextAuthRoute(
  status: AuthStatus,
  segments: string[],
  aiConsent?: AiConsent | null,
): RedirectTarget | null {
  if (status === 'loading') return null;
  const inAuth = segments[0] === '(auth)';
  if (status === 'authenticated' && aiConsent === 'UNASKED' && segments[0] !== 'ai-consent') {
    return '/ai-consent';
  }
  if (status === 'authenticated' && inAuth) return '/(app)';
  if (status === 'unauthenticated' && !inAuth) return '/(auth)/login';
  return null;
}
