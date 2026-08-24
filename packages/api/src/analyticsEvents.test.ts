import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAnalytics, setAnalytics } from './analytics';
import type { Analytics } from './analytics';
import {
  ANALYTICS_EVENTS,
  accountAgeDays,
  personPropertiesFromProfile,
  streakBucket,
  trackItemCreated,
} from './analyticsEvents';

function spyAnalytics() {
  const analytics: Analytics = {
    identify: vi.fn(),
    reset: vi.fn(),
    track: vi.fn(),
  };
  setAnalytics(analytics);
  return analytics;
}

describe('personPropertiesFromProfile', () => {
  /**
   * The whole point of a person property here is to be a cohort boundary. An absent
   * field reported as a zero would put an account with no streak and an account whose
   * streak the payload did not carry into the same audience, and only one of those is
   * true.
   */
  it('omits a property the profile does not carry rather than defaulting it', () => {
    const properties = personPropertiesFromProfile({});

    expect(properties).toEqual({});
    expect('level' in properties).toBe(false);
    expect('streak_current' in properties).toBe(false);
    expect('signup_date' in properties).toBe(false);
  });

  it('reports zero as zero — it is a value, not an absence', () => {
    const properties = personPropertiesFromProfile({ level: 0, constance: 0 });

    expect(properties.level).toBe(0);
    expect(properties.streak_current).toBe(0);
    expect(properties.streak_bucket).toBe('none');
  });

  /**
   * Numbers have to stay numbers across the seam. A stringified level makes every
   * cohort filter on it a lexical comparison, where "10" sorts below "9" — the kind of
   * break that produces a plausible-looking wrong audience rather than an error.
   */
  it('keeps numeric properties numeric and boolean properties boolean', () => {
    const properties = personPropertiesFromProfile({
      level: 10,
      xp: 1234.5,
      constance: 9,
      maxConstance: 41,
      constanceDormant: false,
      isTutorialCompleted: true,
      isGoogleAccount: false,
    });

    expect(properties.level).toBe(10);
    expect(properties.xp).toBe(1234.5);
    expect(properties.streak_current).toBe(9);
    expect(properties.streak_best).toBe(41);
    expect(properties.streak_dormant).toBe(false);
    expect(properties.tutorial_completed).toBe(true);
    expect(properties.is_google_account).toBe(false);
  });

  it('carries the display name when given one, and nothing name-shaped when not', () => {
    expect(personPropertiesFromProfile({}, 'Alice').name).toBe('Alice');
    expect('name' in personPropertiesFromProfile({}, null)).toBe(false);
    expect('name' in personPropertiesFromProfile({}, '')).toBe(false);
  });

  /**
   * The PII line for this whole phase. `email` is on both profile types the callers
   * pass, so the guard that matters is that this builder reads a fixed list of fields
   * rather than spreading whatever it was handed.
   */
  it('never reports the email, even when the profile it is handed carries one', () => {
    const withEmail = { email: 'alice@example.com', level: 2 } as Parameters<
      typeof personPropertiesFromProfile
    >[0];

    const properties = personPropertiesFromProfile(withEmail, 'Alice');

    expect(JSON.stringify(properties)).not.toContain('alice@example.com');
    expect('email' in properties).toBe(false);
  });

  it('derives the account age alongside the signup date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-24T12:00:00Z'));

    const properties = personPropertiesFromProfile({ createdAt: '2026-08-14' });

    expect(properties.signup_date).toBe('2026-08-14');
    expect(properties.account_age_days).toBe(10);
  });
});

describe('streakBucket', () => {
  /**
   * The boundaries are the ones the engagement triggers act on, so an off-by-one here
   * would put a 7-day run — the first milestone the product celebrates — in the bucket
   * meant for runs that have barely started.
   */
  it('buckets on the boundaries the triggers care about', () => {
    expect(streakBucket(undefined)).toBe('none');
    expect(streakBucket(0)).toBe('none');
    expect(streakBucket(1)).toBe('1-6');
    expect(streakBucket(6)).toBe('1-6');
    expect(streakBucket(7)).toBe('7-29');
    expect(streakBucket(29)).toBe('7-29');
    expect(streakBucket(30)).toBe('30+');
    expect(streakBucket(365)).toBe('30+');
  });
});

describe('accountAgeDays', () => {
  /**
   * The signup date is stamped from the server's calendar day and read on a device that
   * may be most of a day away from it. Comparing both ends as UTC midnights is what
   * keeps the answer from moving by one depending on where the reader is sitting — the
   * fixtures below are the two extremes, 14 hours ahead and 12 behind.
   */
  it('is the same number either side of the date line', () => {
    const farEast = new Date('2026-08-24T23:30:00+14:00');
    const farWest = new Date('2026-08-24T00:30:00-12:00');

    expect(accountAgeDays('2026-08-01', farEast)).toBe(23);
    expect(accountAgeDays('2026-08-01', farWest)).toBe(23);
  });

  it('reads a full ISO instant as its date part', () => {
    expect(accountAgeDays('2026-08-20T09:26:53Z', new Date('2026-08-24T00:00:00Z'))).toBe(4);
  });

  it('is zero on the signup day itself', () => {
    expect(accountAgeDays('2026-08-24', new Date('2026-08-24T18:00:00Z'))).toBe(0);
  });

  /**
   * A future or unreadable date means the property is worth omitting, not worth
   * guessing: a negative age would silently land in every "new account" cohort.
   */
  it('returns null rather than a negative or invented age', () => {
    expect(accountAgeDays('2027-01-01', new Date('2026-08-24T00:00:00Z'))).toBeNull();
    expect(accountAgeDays('not-a-date')).toBeNull();
    expect(accountAgeDays('')).toBeNull();
  });
});

describe('trackItemCreated', () => {
  beforeEach(() => {
    spyAnalytics();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('tracks the created item with its type', () => {
    trackItemCreated('habit', { success: {} } as { error?: unknown });

    expect(getAnalytics().track).toHaveBeenCalledWith(ANALYTICS_EVENTS.ITEM_CREATED, {
      item_type: 'habit',
    });
  });

  /**
   * These endpoints answer a refusal in the body rather than by throwing, so without
   * this the activation funnel would count failed submissions as created items — the one
   * number the event exists to answer.
   */
  it('does not track when the response body carried a refusal', () => {
    trackItemCreated('goal', { error: { message: 'nope' } });

    expect(getAnalytics().track).not.toHaveBeenCalled();
  });

  it('tracks when there is no body to inspect', () => {
    trackItemCreated('routine', undefined);

    expect(getAnalytics().track).toHaveBeenCalledTimes(1);
  });
});
