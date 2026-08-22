import posthog from "posthog-js";
import type { CaptureResult } from "posthog-js";
import { setAnalytics } from "@beyou/api";

/**
 * Product analytics for the web app (PostHog Cloud), phase 2 of the analytics
 * plan: which features get used, where users click (autocapture feeds the
 * heatmap/toolbar view), funnels and retention. Infrastructure-side questions
 * (concurrent users, logins per day) are answered by the backend's
 * beyou_active_users gauge and the V22 columns, not here.
 *
 * Mirrors the telemetry posture (`lib/telemetry.ts`): completely dormant unless
 * VITE_POSTHOG_KEY is set — no key, no `posthog.init()`, nothing captured on a
 * dev machine or CI runner.
 *
 * PII posture, same as everywhere else in this stack:
 * - `mask_all_text` / `mask_all_element_attributes`: autocapture records DOM
 *   structure and coordinates but never element text or attribute values. The
 *   routine check-in control is labelled with the user's own habit name (see
 *   `scrubUiBreadcrumb` in telemetry.ts for the same problem on the error
 *   side), so an unmasked click event would ship user content on every check-in.
 * - Identity is the account's opaque UUID only (`identify()` below, fed by
 *   `hydratePerfil`), never email or name.
 * - `person_profiles: "identified_only"`: anonymous visitors to the public
 *   pages don't each mint a (billed) person profile.
 * - Session recording stays off — heatmaps and events don't need it, and
 *   recordings are the easiest way to leak user content wholesale.
 */

/**
 * Removes the query string (and hash) from a URL, keeping origin and path.
 *
 * Same leak `stripQuery` in telemetry.ts closes for the error collector, now
 * observed for real on the analytics side: the Google OAuth callback lands on
 * `/?state=…&code=…`, and that full URL — single-use authorization code
 * included — was captured into `$current_url` on the pageview. Reset-password
 * and verify-email tokens ride query strings too. No query string on this app
 * carries analytics value, so they are all stripped rather than allowlisted.
 */
function stripUrlQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

/** Every URL-bearing property autocapture/pageviews attach. */
const URL_PROPERTY_KEYS = [
  "$current_url",
  "$referrer",
  "$prev_pageview_pathname",
  "$session_entry_url",
  "$session_entry_referrer",
] as const;

/** The send gate: scrubs credential-bearing query strings off every event. */
export function scrubEventUrls(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  for (const key of URL_PROPERTY_KEYS) {
    const value = event.properties?.[key];
    if (typeof value === "string") event.properties[key] = stripUrlQuery(value);
  }
  const setOnce = event.$set_once as Record<string, unknown> | undefined;
  for (const key of ["$initial_current_url", "$initial_referrer"]) {
    const value = setOnce?.[key];
    if (typeof value === "string") setOnce![key] = stripUrlQuery(value);
  }
  return event;
}

/** Set once `initAnalytics()` has actually called `posthog.init()`. */
let initialised = false;

/** Test seam — mirrors `isTelemetryInitialised()`. */
export function isAnalyticsInitialised(): boolean {
  return initialised;
}

export function initAnalytics(): boolean {
  if (initialised) return true;

  const key = import.meta.env.VITE_POSTHOG_KEY?.trim();
  if (!key) return false;

  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST?.trim() || "https://us.i.posthog.com",

    // Opt into the SDK's dated defaults bundle: among other things it captures
    // SPA pageviews on history changes, which a react-router app needs — the
    // classic default only fires on full document loads, i.e. once per session.
    defaults: "2025-05-24",

    autocapture: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
    person_profiles: "identified_only",
    disable_session_recording: true,

    // See scrubEventUrls — OAuth codes and reset tokens ride query strings.
    before_send: scrubEventUrls,

    // Same split as telemetry's `environment`: keeps a dev rebuild loop from
    // polluting the production insights.
    loaded: (ph) => {
      if (import.meta.env.DEV) ph.register({ environment: "development" });
    },
  });

  // Everything below the seam (shared packages, hydratePerfil, feature code)
  // talks to @beyou/api's Analytics interface, never to posthog directly — the
  // same code works on mobile once posthog-react-native is wired in there.
  setAnalytics({
    identify: (userId, traits) => posthog.identify(userId, traits),
    reset: () => posthog.reset(),
    track: (event, properties) => posthog.capture(event, properties),
  });

  initialised = true;
  return true;
}
