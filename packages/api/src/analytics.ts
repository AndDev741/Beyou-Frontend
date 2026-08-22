/**
 * Product-analytics seam, mirroring the `setLogger()` pattern: shared code and
 * both apps call these functions; each host app injects its platform SDK once
 * at boot (web: posthog-js in `apps/web/src/lib/analytics.ts`; mobile:
 * posthog-react-native when it lands). The default is a no-op, so a test run,
 * Storybook, or an app that never wires analytics reports nothing — the same
 * dormant-by-default posture as error telemetry.
 *
 * PII rule: `identify()` takes the account's opaque UUID (`UserType.id`) and
 * nothing else. Never pass email or name here, and never put user-written
 * content (habit names, feedback text, chat messages) in `track()` properties.
 */
export interface Analytics {
  /** Ties the current device/session to the account's opaque UUID. */
  identify(userId: string): void;
  /** Clears the identity on logout so the next user on this device is not merged. */
  reset(): void;
  /** Records a named product event. Property values must be PII-free. */
  track(event: string, properties?: Record<string, string | number | boolean>): void;
}

const noopAnalytics: Analytics = {
  identify: () => undefined,
  reset: () => undefined,
  track: () => undefined,
};

let analytics: Analytics = noopAnalytics;

export function setAnalytics(a: Analytics): void { analytics = a; }
export function getAnalytics(): Analytics { return analytics; }
