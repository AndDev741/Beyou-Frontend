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

/** `htmlTreeAsString` joins the ancestor chain with this, target last. */
const DOM_PATH_SEPARATOR = " > ";

/**
 * Element names the DOM serialiser can emit. Every tag it produces comes from
 * `elem.tagName.toLowerCase()`, so the vocabulary is closed and lower-case; SVG
 * names are included because most clickable icons in this app are react-icons
 * `<svg><path>` and dropping them would gut the breadcrumb.
 */
const KNOWN_TAGS = new Set(
  `a abbr address area article aside audio b base bdi bdo blockquote body br
   button canvas caption cite code col colgroup data datalist dd del details dfn
   dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4
   h5 h6 head header hgroup hr html i iframe img input ins kbd label legend li
   link main map mark menu meta meter nav noscript object ol optgroup option
   output p picture pre progress q rp rt ruby s samp script search section select
   slot small source span strong style sub summary sup table tbody td template
   textarea tfoot th thead time title tr track u ul var video wbr
   svg circle clippath defs ellipse foreignobject g image line lineargradient
   marker mask path pattern polygon polyline radialgradient rect stop symbol text
   tspan use`.split(/\s+/)
);

/**
 * The only attribute values allowed to survive. `type` is worth keeping — it
 * says whether a click landed on a checkbox or a submit button — and it is a
 * fixed HTML token rather than anything a user wrote.
 */
const KNOWN_TYPE_VALUES = new Set(
  `button checkbox color date datetime-local email file hidden image month number
   password radio range reset search submit tel text time url week`.split(/\s+/)
);

/** Leading tag name of one serialised element. */
const LEADING_TAG = /^[a-z][a-z0-9-]*/;

/** A `type` attribute whose value cannot itself contain a quote or a bracket. */
const TYPE_ATTR = /\[type="([a-z][a-z0-9-]*)"\]/g;

/**
 * Rebuilds one serialised element from vocabulary only: its tag, plus a `type`
 * if the element carries a recognised one. Returns `null` for anything whose
 * leading token is not a known tag — which is how text that leaked out of an
 * attribute value and got mistaken for an element is discarded rather than
 * emitted.
 */
function structureOf(element: string): string | null {
  const tag = LEADING_TAG.exec(element)?.[0];
  if (!tag || !KNOWN_TAGS.has(tag)) return null;

  for (const [, value] of element.matchAll(TYPE_ATTR)) {
    if (KNOWN_TYPE_VALUES.has(value)) return `${tag}[type="${value}"]`;
  }
  return tag;
}

/**
 * Reduces a `ui.*` breadcrumb message to DOM structure, dropping every
 * attribute value, id and class.
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
 * ALLOWLIST, not blacklist, and that is the whole point. Matching the dangerous
 * attributes cannot work: the serialiser interpolates values raw
 * (`out.push(`[${k}="${attr}"]`)`), so a habit named `Ler "Hamlet"` produces
 * `input[aria-label="Ler "Hamlet""]` and any `[^"]*` matcher stops at the first
 * inner quote and leaves `Hamlet""]` behind — a partial leak of exactly what
 * this exists to remove. A value may equally contain `[`, `]` or the ` > `
 * separator, so the message is not reliably parseable at all. Emitting only
 * tokens drawn from `KNOWN_TAGS`/`KNOWN_TYPE_VALUES` sidesteps that: whatever
 * the value contains, nothing that is not already hard-coded here can come out,
 * for any quoting and for any attribute a future SDK version adds.
 *
 * The cost is that unrecognised fragments vanish rather than being sanitised —
 * the serialiser's `<unknown>` placeholder, and the component names
 * `data-sentry-component` would inject if `reactComponentAnnotation` were ever
 * enabled in `vite.config.ts`. Both are safe to keep in principle, but neither
 * is distinguishable from value text by inspection, so they lose.
 *
 * Exported for the test suite, which asserts on the produced message rather
 * than on the configuration — pinning the config is what let the previous
 * attempt pass while still leaking.
 */
export function scrubUiBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (!breadcrumb.category?.startsWith("ui.") || typeof breadcrumb.message !== "string") {
    return breadcrumb;
  }

  breadcrumb.message = breadcrumb.message
    .split(DOM_PATH_SEPARATOR)
    .map(structureOf)
    .filter((element): element is string => element !== null)
    .join(DOM_PATH_SEPARATOR);

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
