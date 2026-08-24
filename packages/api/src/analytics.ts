/**
 * Product-analytics seam, mirroring the `setLogger()` pattern: shared code and
 * both apps call these functions; each host app injects its platform SDK once
 * at boot (web: posthog-js in `apps/web/src/lib/analytics.ts`; mobile:
 * posthog-react-native when it lands). The default is a no-op, so a test run,
 * Storybook, or an app that never wires analytics reports nothing — the same
 * dormant-by-default posture as error telemetry.
 *
 * PII rule: `identify()` takes the account's opaque UUID (`UserType.id`) plus
 * the display name — a deliberate, product-owner-approved exception so person
 * profiles are recognizable in PostHog. Never pass the email, and never put
 * user-written content (habit names, feedback text, chat messages) in
 * `track()` properties.
 */
/**
 * The only value types either SDK is allowed to carry, for events and for person
 * properties alike. Deliberately not `unknown`: a nested object is how user-written
 * content slips in by accident, and neither PostHog SDK gains anything from one here.
 */
export type AnalyticsProperties = Record<string, string | number | boolean>;

export interface Analytics {
  /**
   * Ties the current device/session to the account's opaque UUID.
   *
   * `traits` become person properties. They carry the display name (the approved
   * exception above) plus the account-shape properties from
   * `personPropertiesFromProfile` — enums, counters and dates, never free text.
   * They are numbers as often as strings, which is why this is not
   * `Record<string, string>`: stringifying a level would make every cohort filter
   * on it a lexical comparison, where 10 sorts below 9.
   */
  identify(userId: string, traits?: AnalyticsProperties): void;
  /** Clears the identity on logout so the next user on this device is not merged. */
  reset(): void;
  /** Records a named product event. Property values must be PII-free. */
  track(event: string, properties?: AnalyticsProperties): void;
}

const noopAnalytics: Analytics = {
  identify: () => undefined,
  reset: () => undefined,
  track: () => undefined,
};

let analytics: Analytics = noopAnalytics;

export function setAnalytics(a: Analytics): void { analytics = a; }
export function getAnalytics(): Analytics { return analytics; }
