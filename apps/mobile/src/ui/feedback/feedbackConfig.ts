import Constants from 'expo-constants';

type FeedbackExtra = { feedbackEmail?: string };

/**
 * KD6: the mailbox is an ALTERNATIVE EXIT, not an inbound pipeline — nothing
 * parses what lands there.
 *
 * Overridable through `EXPO_PUBLIC_FEEDBACK_EMAIL` (see `.env.example`), the
 * same mechanism every other build-configurable value in this app uses. It
 * previously claimed to read `expo.extra.feedbackEmail`, but nothing set that:
 * `app.json` has no `extra` block and static JSON cannot read the environment,
 * so every build silently resolved to the literal below. That fallback is still
 * honoured for a build that does define `extra`, but it is no longer the only
 * documented route.
 *
 * Whitespace counts as unset: a blank line in `.env` must not produce
 * `mailto:?subject=…` with no recipient.
 */
export const FEEDBACK_EMAIL =
  process.env.EXPO_PUBLIC_FEEDBACK_EMAIL?.trim() ||
  (Constants.expoConfig?.extra as FeedbackExtra | undefined)?.feedbackEmail ||
  'support@beyou.app';

/** Build version reported in the automatic capture context. */
export const APP_VERSION = Constants.expoConfig?.version ?? '';
