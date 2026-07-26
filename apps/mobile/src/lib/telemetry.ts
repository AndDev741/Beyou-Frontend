import * as Sentry from '@sentry/react-native';

/**
 * Unhandled-error telemetry for the mobile app (R16/R17).
 *
 * Points at the self-hosted GlitchTip collector, which speaks the Sentry ingest
 * API, so the official SDK talks to it by DSN alone — no vendor account.
 *
 * Mirrors the backend's posture (see `application.yaml`): the integration stays
 * completely dormant unless a DSN is configured. No DSN means `Sentry.init()` is
 * never called, so a developer machine or CI runner without one reports nothing
 * rather than silently trying to reach a collector that isn't there.
 *
 * ---------------------------------------------------------------------------
 * ⚠️  DELIVERY IS NOT VERIFIED ON A REAL DEVICE (KTD7 gate — still OPEN).
 *
 * This wiring is code-ready, NOT delivery-proven. The gate for this feature is
 * an end-to-end check that a deliberate error thrown from a *release* build on
 * a *physical* device actually arrives in GlitchTip. That check has not been
 * run: it cannot be performed from a CI/agent environment.
 *
 * Why that matters more than usual here: upstream issue #6256 reported events
 * being created but never transmitted on exactly this stack (RN 0.85.3, Expo
 * SDK 56, New Architecture, Android). It is now CLOSED as resolved, and the
 * maintainer's diagnosis was a *configuration* fault — a missing Expo config
 * plugin — not an SDK defect. That is why `@sentry/react-native/expo` MUST stay
 * in `app.json`'s `plugins` array: without it the native module is not linked
 * into the build, `captureException()` still returns a plausible event id, and
 * NOTHING is ever sent. The failure mode is silent, which is precisely why it
 * has to be confirmed by observation rather than assumed.
 *
 * Until someone runs that check, treat mobile error reporting as unconfirmed.
 * ---------------------------------------------------------------------------
 */

/** Set once `initTelemetry()` has actually called `Sentry.init()`. */
let initialised = false;

/** Test seam — lets the suite assert the no-DSN branch without re-importing. */
export function isTelemetryInitialised(): boolean {
  return initialised;
}

/**
 * Initialise error reporting, if a collector is configured.
 *
 * @returns `true` when the SDK was initialised, `false` when no DSN is set (and
 *          therefore nothing will be reported).
 */
export function initTelemetry(): boolean {
  if (initialised) return true;

  // EXPO_PUBLIC_* is inlined into the bundle at build time. An unset value is
  // the documented "telemetry off" switch, so treat blank/whitespace as unset —
  // an empty line in `.env` must not count as "configured".
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return false;

  Sentry.init({
    dsn,

    // Errors only. GlitchTip is an error store, not an APM — leaving tracing on
    // would ship transactions it has no useful view for, and burn its bounded
    // 30-day retention on performance data instead of crashes.
    //
    // In SDK v8 tracing stays off when `tracesSampleRate` is unset; pinning it
    // to 0 and disabling the auto-performance integrations makes that explicit
    // so a future default change can't quietly turn transactions back on.
    tracesSampleRate: 0,
    enableAutoPerformanceTracing: false,

    // This app's whole posture is that user data does not leak into telemetry
    // (cf. the redux-persist PII blacklist). Default is already false in v8;
    // stated outright so it survives an SDK upgrade.
    sendDefaultPii: false,

    // Separates the noise of a dev rebuild loop from real user crashes in the
    // collector's UI, which matters for R17's "alert on NEW errors" to be worth
    // anything.
    environment: __DEV__ ? 'development' : 'production',

    // The one lever that makes the delivery gate diagnosable: with this on, the
    // SDK logs its transport decisions. Dev-only so release builds stay quiet.
    debug: __DEV__,
  });

  initialised = true;
  return true;
}
