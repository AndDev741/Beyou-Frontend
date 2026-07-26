import Constants from 'expo-constants';

type FeedbackExtra = { feedbackEmail?: string };

/**
 * KD6: the mailbox is an ALTERNATIVE EXIT, not an inbound pipeline — nothing
 * parses what lands there. Overridable through `expo.extra.feedbackEmail` so a
 * build can point at a different address without a code change.
 */
export const FEEDBACK_EMAIL =
  (Constants.expoConfig?.extra as FeedbackExtra | undefined)?.feedbackEmail || 'support@beyou.app';

/** Build version reported in the automatic capture context. */
export const APP_VERSION = Constants.expoConfig?.version ?? '';
