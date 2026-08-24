import { getAnalytics } from './analytics';
import type { AnalyticsProperties } from './analytics';

/**
 * The product-event vocabulary, phase 0 of the engagement work.
 *
 * **Named after the engagement trigger, not after the UI that happened to fire it.**
 * The point of this phase is that the nudge job (backend, later) and the measurement of
 * that nudge (here) read the same concept: `check_recorded` is the thing a streak is made
 * of, whereas `dashboard_check_button_clicked` would be a fact about a button and would
 * stop being true the next time the dashboard is redesigned. Every name below answers a
 * question the engagement work actually asks — see the signal inventory on the ticket.
 *
 * Names are `snake_case` because that is what PostHog's own event taxonomy uses, and
 * stable: renaming an event orphans every insight, funnel and cohort built on it.
 *
 * **PII rule, inherited from the seam and not negotiable here:** no user-written content
 * in any property. Habit names, goal names, category names, feedback text and chat
 * messages are all out. What a property may carry is a count, an enum, a boolean, an id
 * the backend also uses, or a duration. When in doubt, count the thing instead of naming
 * it.
 */
export const ANALYTICS_EVENTS = {
  /**
   * An item was checked (or skipped) and the backend accepted it. The atom of every
   * streak, XP total and completion rate in the product, so it is the event the whole
   * engagement funnel is built on.
   */
  CHECK_RECORDED: 'check_recorded',
  /** The account's level went up. The reward half of the XP loop. */
  LEVEL_UP: 'level_up',
  /**
   * The account streak crossed one of `STREAK_MILESTONES`. Distinct from
   * `check_recorded`: it is the moment the streak becomes worth protecting, which is
   * exactly the population a streak-at-risk nudge targets.
   */
  STREAK_MILESTONE_REACHED: 'streak_milestone_reached',
  /** A goal, habit, task, routine or category was created. Carries `item_type`. */
  ITEM_CREATED: 'item_created',
  /** A goal was marked complete. The only item type with a completion of its own. */
  GOAL_COMPLETED: 'goal_completed',
  /** The onboarding tutorial was finished — the activation line for a new account. */
  TUTORIAL_COMPLETED: 'tutorial_completed',
  /** The AI agent was asked something. Adoption of the shortest activation path. */
  AGENT_MESSAGE_SENT: 'agent_message_sent',
  /** AI onboarding suggestions were requested, per step. */
  ONBOARDING_SUGGESTIONS_REQUESTED: 'onboarding_suggestions_requested',
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/** The item kinds `ITEM_CREATED` distinguishes. */
export type CreatedItemType = 'habit' | 'task' | 'goal' | 'routine' | 'category';

/**
 * Everything `personPropertiesFromProfile` reads off a loaded profile.
 *
 * Structural and fully optional on purpose: web passes `@beyou/types`' `UserType` and
 * mobile passes `@beyou/contracts`' `Schemas['UserResponseDTO']`, which are two hand-kept
 * views of the same response and are not the same type. Requiring either one here would
 * make this helper unusable on the other platform, and the honest answer for a field a
 * given client does not have is to omit the property rather than invent a value.
 */
export type ProfileForAnalytics = {
  constance?: number;
  maxConstance?: number;
  constanceDormant?: boolean;
  level?: number;
  xp?: number;
  isTutorialCompleted?: boolean;
  isGoogleAccount?: boolean;
  timezone?: string;
  timezoneSource?: string;
  xpDecayStrategy?: string;
  languageInUse?: string | null;
  themeInUse?: string | null;
  createdAt?: string | null;
};

/**
 * Buckets a streak length instead of reporting it raw.
 *
 * A person property is overwritten on every identify, so the raw number would be a
 * value that changes every day and is therefore useless as a cohort boundary — "users
 * whose streak is 23" is not a population anyone wants. The buckets are the boundaries
 * the engagement triggers actually care about: nothing yet, a run that has just started,
 * one worth protecting, and one worth celebrating.
 */
export function streakBucket(constance: number | undefined): string {
  if (constance === undefined || constance <= 0) return 'none';
  if (constance < 7) return '1-6';
  if (constance < 30) return '7-29';
  return '30+';
}

/**
 * The person properties that make the engagement cohorts buildable.
 *
 * Called from the one place on each platform that loads a profile (web
 * `hydratePerfil`, mobile `AnalyticsSync`), so no login/refresh path has to remember it.
 *
 * Why these and not events: every one of them is a *state* of the account rather than
 * something that happened, and the audiences the engagement work needs are all stated in
 * those terms — "unverified accounts with no routine", "COMPLETE-mode users on a 30-day
 * run", "accounts older than a month that never finished the tutorial". A person
 * property is also the one thing that cannot be reconstructed after the fact: an event
 * missed today can be replayed from the database, a person property that was never set
 * has no history at all.
 *
 * `signupDate` deserves its own note. It is the account's real creation day, which the
 * analytics provider's own first-seen timestamp is not: for every account that predates
 * the instrumentation those two are different dates, and only the backend knows the
 * first one. `accountAgeDays` is derived here rather than sent, because it would be
 * stale the moment it was stored.
 *
 * Counts of routines/habits/goals are deliberately NOT here. They live in each client's
 * store, loaded by a different request than the profile, so reading them here would tie
 * this helper to a load order it cannot see. They belong to `item_created` and to the
 * backend's own view of the account.
 */
export function personPropertiesFromProfile(
  profile: ProfileForAnalytics,
  name?: string | null,
): AnalyticsProperties {
  const properties: AnalyticsProperties = {};

  // The one approved PII exception, kept so person profiles are recognizable.
  if (name) properties.name = name;

  if (profile.level !== undefined) properties.level = profile.level;
  if (profile.xp !== undefined) properties.xp = profile.xp;
  if (profile.constance !== undefined) {
    properties.streak_current = profile.constance;
    properties.streak_bucket = streakBucket(profile.constance);
  }
  if (profile.maxConstance !== undefined) properties.streak_best = profile.maxConstance;
  if (profile.constanceDormant !== undefined) properties.streak_dormant = profile.constanceDormant;
  if (profile.isTutorialCompleted !== undefined) {
    properties.tutorial_completed = profile.isTutorialCompleted;
  }
  if (profile.isGoogleAccount !== undefined) properties.is_google_account = profile.isGoogleAccount;
  if (profile.timezone) properties.timezone = profile.timezone;
  if (profile.timezoneSource) properties.timezone_source = profile.timezoneSource;
  if (profile.xpDecayStrategy) properties.xp_decay_strategy = profile.xpDecayStrategy;
  if (profile.languageInUse) properties.language = profile.languageInUse;
  if (profile.themeInUse) properties.theme = profile.themeInUse;

  if (profile.createdAt) {
    properties.signup_date = profile.createdAt;
    const ageDays = accountAgeDays(profile.createdAt);
    if (ageDays !== null) properties.account_age_days = ageDays;
  }

  return properties;
}

/**
 * Whole days between the signup date and today, or null when the value cannot be read.
 *
 * Both dates are compared as UTC midnights, so the result cannot come out one day off
 * because the device happens to sit east or west of the server that stamped the signup.
 * A malformed or future value returns null rather than a negative age: the property is
 * worth omitting, not worth guessing.
 */
export function accountAgeDays(createdAt: string, now: Date = new Date()): number | null {
  const signup = Date.parse(`${createdAt.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(signup)) return null;

  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Math.floor((todayUtc - signup) / 86_400_000);
  return days < 0 ? null : days;
}

/**
 * Records `item_created` for a create call that actually created something.
 *
 * One helper rather than the same three lines in five `create*` files, because the
 * interesting part is the condition, not the call: these endpoints return their payload
 * as `response.data`, and a body carrying an `error` key is a refusal the client is
 * expected to render, not a created item. Counting those would put failed submissions
 * into an activation funnel — the one number this event exists to answer.
 *
 * A thrown request never reaches here at all: every caller catches below the `await`.
 */
export function trackItemCreated(
  itemType: CreatedItemType,
  response: { error?: unknown } | null | undefined,
): void {
  if (response && typeof response === 'object' && 'error' in response && response.error) return;
  getAnalytics().track(ANALYTICS_EVENTS.ITEM_CREATED, { item_type: itemType });
}
