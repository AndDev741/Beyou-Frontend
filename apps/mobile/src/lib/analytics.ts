import PostHog from 'posthog-react-native';
import { setAnalytics } from '@beyou/api';

/**
 * Product analytics for the mobile app (PostHog Cloud), phase 3 of the
 * analytics plan — the native sibling of `apps/web/src/lib/analytics.ts`.
 *
 * Mirrors the telemetry posture (`lib/telemetry.ts`): completely dormant unless
 * EXPO_PUBLIC_POSTHOG_KEY is set. No key means no client is ever constructed,
 * `getPostHog()` returns null, `_layout.tsx` renders no provider, and the
 * shared `@beyou/api` analytics seam stays a no-op.
 *
 * PII posture, matching web:
 * - Identity is the account's opaque UUID only (`AnalyticsSync` feeds it from
 *   the auth profile), never email or name.
 * - Screen/touch autocapture is configured on the provider in `_layout.tsx`
 *   with element labels off — see the noCaptureProp note there.
 * - Session replay is not installed at all (it is a separate optional module).
 */

/** The singleton client, or null when analytics is off / not yet initialised. */
let client: PostHog | null = null;

/** Test seam — mirrors `isTelemetryInitialised()`. */
export function isAnalyticsInitialised(): boolean {
  return client !== null;
}

/**
 * Initialise product analytics, if a key is configured, and wire the shared
 * `@beyou/api` seam so platform-agnostic code can `track()` without knowing
 * the SDK. Returns the client for `PostHogProvider`, or null when analytics
 * is off.
 */
export function initAnalytics(): PostHog | null {
  if (client) return client;

  // EXPO_PUBLIC_* is inlined into the bundle at build time. An unset value is
  // the documented "analytics off" switch, so treat blank/whitespace as unset.
  const key = process.env.EXPO_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) return null;

  client = new PostHog(key, {
    host: process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com',
    // Anonymous app-open events on the login screen shouldn't each mint a
    // (billed) person profile — same setting as web.
    personProfiles: 'identified_only',
  });

  const ph = client;
  setAnalytics({
    // The traits argument is passed on, not dropped: it carries the person
    // properties every engagement cohort is built from, and posthog-react-native
    // takes them in the same second position web's posthog-js does.
    identify: (userId, traits) => ph.identify(userId, traits),
    reset: () => ph.reset(),
    track: (event, properties) => ph.capture(event, properties),
  });

  return client;
}

/** The initialised client, for `PostHogProvider` in `_layout.tsx`. */
export function getPostHog(): PostHog | null {
  return client;
}
