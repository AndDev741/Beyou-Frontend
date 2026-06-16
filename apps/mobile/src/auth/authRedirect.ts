import type { AuthStatus } from './types';

export type RedirectTarget = '/(app)' | '/(auth)/login';

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
 */
export function nextAuthRoute(status: AuthStatus, segments: string[]): RedirectTarget | null {
  if (status === 'loading') return null;
  const inAuth = segments[0] === '(auth)';
  if (status === 'authenticated' && inAuth) return '/(app)';
  if (status === 'unauthenticated' && !inAuth) return '/(auth)/login';
  return null;
}
