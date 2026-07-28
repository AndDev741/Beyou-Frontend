import * as Sentry from "@sentry/react";
import type { Breadcrumb, ErrorEvent, EventHint } from "@sentry/react";
import { APP_VERSION } from "../appVersion";

/**
 * Unhandled-error telemetry for the web app (R16/R17/R18).
 *
 * Points at the self-hosted GlitchTip collector, which speaks the Sentry ingest
 * API, so the official SDK talks to it by DSN alone — no vendor account.
 *
 * Mirrors the backend (`application.yaml`) and mobile (`apps/mobile/src/lib/
 * telemetry.ts`) posture: the integration stays completely dormant unless a DSN
 * is configured. No DSN means `Sentry.init()` is never called, so a developer
 * machine, a CI runner, or a build made before the collector existed reports
 * nothing rather than silently retrying an endpoint that isn't there.
 */

/**
 * Release identifier. It has to match the `release` the source maps are
 * uploaded under (see `vite.config.ts`), or the collector holds maps it cannot
 * associate with an event and every production frame stays minified (R18).
 * Injected by Vite's `define` so BOTH sides derive it from one expression;
 * falls back for bare tooling runs, the same way `appVersion.ts` does.
 */
export const TELEMETRY_RELEASE: string =
  typeof __SENTRY_RELEASE__ === "string" ? __SENTRY_RELEASE__ : `beyou-web@${APP_VERSION}`;

/**
 * Scripts injected into the page by a browser extension. Their exceptions are
 * attributed to whatever page they run in, so without this a single popular
 * extension can out-number every real crash in the collector — and there is
 * nothing anyone here could fix in response.
 */
const EXTENSION_URL_SCHEMES = [
  "chrome-extension://",
  "moz-extension://",
  "safari-extension://",
  "safari-web-extension://",
  "ms-browser-extension://"
];

/**
 * Cancellation, not failure. A user navigating away mid-request aborts every
 * in-flight fetch; the app already handles that, and reporting it turns routine
 * browsing into a wall of noise.
 */
const CANCELLED_ERROR_TYPES = ["AbortError", "CanceledError"];

/**
 * Lower-cased message fragments that are benign by construction. The
 * ResizeObserver warning is a browser-emitted layout notice with no user-visible
 * effect; browsers report it as an error purely by convention.
 */
const NOISE_MESSAGE_FRAGMENTS = [
  "the operation was aborted",
  "the user aborted a request",
  "navigation cancelled",
  "navigation aborted",
  "resizeobserver loop"
];

function isExtensionInjected(event: ErrorEvent): boolean {
  const frames = event.exception?.values?.flatMap((value) => value.stacktrace?.frames ?? []) ?? [];
  return frames.some((frame) =>
    EXTENSION_URL_SCHEMES.some((scheme) => (frame.filename ?? "").startsWith(scheme))
  );
}

function isCancellation(event: ErrorEvent): boolean {
  return (event.exception?.values ?? []).some((value) => {
    if (value.type && CANCELLED_ERROR_TYPES.includes(value.type)) return true;
    const message = (value.value ?? "").toLowerCase();
    return NOISE_MESSAGE_FRAGMENTS.some((fragment) => message.includes(fragment));
  });
}

/**
 * Removes the query string from a URL, keeping origin and path.
 *
 * `httpContextIntegration` is a default integration and it sets
 * `event.request.url` to the full `location.href`. Two screens read a live
 * single-use credential out of the query string — `/reset-password?token=` and
 * `/auth/verify?token=` — so any error raised on either would ship that token
 * to the collector and leave it there for the whole retention window.
 * `sendDefaultPii: false` does not cover this: the URL is not classed as PII.
 */
function stripQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

/**
 * Attributes the DOM breadcrumb serialiser appends that can carry text a user
 * wrote. `type` is deliberately absent — it is a fixed HTML token, and keeping
 * it preserves most of the breadcrumb's diagnostic value.
 */
const CONTENT_BEARING_ATTRS = ["aria-label", "name", "title", "alt"];

/**
 * Strips content-bearing attribute selectors out of `ui.*` breadcrumb messages.
 *
 * This is NOT configurable away, which is why it is done here. In
 * `@sentry/core/utils/browser.js`, `serializeAttribute` only replaces the
 * `#id`/`.class` branch; the loop over
 * `["aria-label", "type", "name", "title", "alt"]` runs unconditionally
 * afterwards. So a `dom.serializeAttribute` allowlist looks like a fix and
 * changes nothing about `aria-label`.
 *
 * It matters here because the routine check-in control is labelled with the
 * user's own habit name (`components/dashboard/dayRoutine/routineSection.tsx`),
 * so every check-in would otherwise record `input[aria-label="<habit name>"]`
 * and attach it to the next event. `sendDefaultPii: false` does not gate
 * breadcrumbs at all.
 *
 * Exported for the test suite, which asserts on the produced message rather
 * than on the configuration — pinning the config is what let the previous
 * attempt pass while still leaking.
 */
export function scrubUiBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (!breadcrumb.category?.startsWith("ui.") || typeof breadcrumb.message !== "string") {
    return breadcrumb;
  }

  const attrs = CONTENT_BEARING_ATTRS.join("|");
  breadcrumb.message = breadcrumb.message.replace(
    new RegExp(`\\[(?:${attrs})="[^"]*"\\]`, "g"),
    ""
  );

  return breadcrumb;
}

/**
 * The send gate. Returning `null` drops the event before it leaves the browser,
 * so filtered noise costs nothing — no request, no collector storage, and no
 * spurious "new error" alert (R17).
 *
 * Also scrubs credential-bearing URLs off the event and its breadcrumbs, which
 * is why this runs on every event rather than only the noisy ones.
 *
 * Exported for the test suite; wired in as `beforeSend` below.
 */
export function dropNoisyEvents(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  if (isExtensionInjected(event) || isCancellation(event)) return null;

  if (event.request?.url) {
    event.request.url = stripQuery(event.request.url);
  }

  // Same integration also writes headers.Referer from document.referrer, and the
  // interceptor's own `window.location.href = "/"` on a failed refresh is a real
  // navigation — so a failure on /reset-password?token=... makes that URL the
  // NEXT page's referrer. Scrubbing only request.url left the token a hop away.
  const referer = event.request?.headers?.Referer;
  if (typeof referer === "string") {
    event.request!.headers!.Referer = stripQuery(referer);
  }

  // Navigation breadcrumbs carry from/to URLs, and a fetch/xhr crumb carries the
  // requested URL — all of them reach the collector on the same event.
  for (const crumb of event.breadcrumbs ?? []) {
    if (!crumb.data) continue;
    for (const key of ["from", "to", "url"] as const) {
      const value = crumb.data[key];
      if (typeof value === "string") crumb.data[key] = stripQuery(value);
    }
  }

  return event;
}

/** Set once `initTelemetry()` has actually called `Sentry.init()`. */
let initialised = false;

/** Test seam — lets the suite assert the no-DSN branch without re-importing. */
export function isTelemetryInitialised(): boolean {
  return initialised;
}

/**
 * Initialise error reporting, if a collector is configured. Called once at
 * application entry (`main.tsx`) so errors thrown during boot are covered.
 *
 * @returns `true` when the SDK was initialised, `false` when no DSN is set (and
 *          therefore nothing will be reported).
 */
export function initTelemetry(): boolean {
  if (initialised) return true;

  // VITE_* is inlined into the bundle at build time. An unset value is the
  // documented "telemetry off" switch, so treat blank/whitespace as unset — an
  // empty line in `.env` must not count as "configured".
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn) return false;

  Sentry.init({
    dsn,
    release: TELEMETRY_RELEASE,

    // Separates a dev rebuild loop from real user crashes in the collector's
    // UI, which is what makes R17's "alert on a NEW error" worth anything.
    environment: import.meta.env.DEV ? "development" : "production",

    // Errors only. GlitchTip is an error store, not an APM — leaving tracing on
    // would ship transactions it has no useful view for and burn its bounded
    // 30-day retention on performance data instead of crashes. `vite.config.ts`
    // additionally sets `__SENTRY_TRACING__: false` so the tracing code is
    // tree-shaken out of the bundle rather than merely disabled.
    tracesSampleRate: 0,

    // This app's whole posture is that user data does not leak into telemetry
    // (cf. the redux-persist PII blacklist, and the backend's send-default-pii).
    // Default is already false; stated outright so it survives an SDK upgrade.
    sendDefaultPii: false,

    // See `scrubUiBreadcrumb` — the DOM serialiser cannot be configured out of
    // this, so the produced breadcrumb is rewritten instead.
    beforeBreadcrumb: scrubUiBreadcrumb,

    beforeSend: dropNoisyEvents
  });

  initialised = true;
  return true;
}

/**
 * Report an error that application code caught, so it never reached the SDK's
 * automatic handlers.
 *
 * Load-bearing rather than belt-and-braces: an error boundary catching a render
 * error STOPS it propagating, so `window.onerror` never fires and automatic
 * capture misses every render crash — the most valuable kind. Same reasoning the
 * mobile boundary applies.
 *
 * A no-op when telemetry was never initialised: with no bound client the SDK
 * discards the call.
 */
export function reportCaughtError(error: unknown, componentStack: string | null): void {
  Sentry.captureException(error, {
    contexts: { react: { componentStack: componentStack ?? undefined } }
  });
}

/**
 * Report a failure the shared API client already handled.
 *
 * The client never throws — every operation returns `{ success?, error? }` — so a
 * 500, a dropped connection or a DNS failure never reaches `window.onerror` and
 * never reaches `ErrorBoundary`. Without this the collector was blind to exactly
 * the failures an outage produces.
 *
 * Wired in `main.tsx` as the `report` leg of `createReportingLogger()`, which
 * owns the decision of WHICH failures get here (5xx, transport failures, and
 * anything that is not a recognisable API error — never a 4xx). Keeping the
 * classifier in `@beyou/api` is what guarantees mobile applies the same rule.
 *
 * The `handled: "api"` tag separates these from `reportCaughtError`'s render
 * crashes in the collector. The two paths never see the same error — one covers
 * API catch blocks, the other covers `componentDidCatch` — so a failure produces
 * one issue, not two; the tag is for triage, not deduplication.
 *
 * Explicitly inert before `initTelemetry()` has run with a DSN. `captureException`
 * is already a no-op with no bound client, but stating it here means "no DSN
 * means nothing is reported" is a property of this module rather than of SDK
 * internals that an upgrade could change.
 */
export function reportHandledFailure(error: unknown): void {
  if (!initialised) return;
  Sentry.captureException(error, { tags: { handled: "api" } });
}
