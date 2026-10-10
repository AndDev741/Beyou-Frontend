import type { CardRating, DueCard, ReviewResult } from '@beyou/types/notebook/notebook';

/**
 * A review session's queue, as pure functions so the session's rules are unit tests. Web and
 * mobile both run their review screens on these; the web page used to carry its own copy.
 *
 * - An answer the server schedules for a later day takes the card out of today's queue.
 * - AGAIN (or any answer the server keeps due today) puts the card back at the END, so the
 *   person meets it again after the others, the way Anki does.
 * - `answered` counts cards finished for today; `total` is the queue's size when it was loaded.
 *   Together they make the "3 / 12" in the header, which must not grow when a card comes back.
 */
export type ReviewSession = {
  queue: DueCard[];
  answered: number;
  total: number;
  /** Every answer given, AGAIN included: what the summary reports. */
  reviewed: number;
};

/**
 * What each button would do to a card that has just been answered AGAIN. The server's preview was
 * for the card as it was; after AGAIN its repetitions reset, and SpacedRepetition.next on a
 * reset card gives exactly these (AGAIN today, HARD and GOOD one day, EASY four).
 */
export const AFTER_AGAIN_INTERVALS: Record<CardRating, number> = { AGAIN: 0, HARD: 1, GOOD: 1, EASY: 4 };

export function startSession(cards: DueCard[]): ReviewSession {
  return { queue: cards, answered: 0, total: cards.length, reviewed: 0 };
}

export function afterAnswer(session: ReviewSession, result: ReviewResult): ReviewSession {
  const [current, ...rest] = session.queue;
  if (!current || current.id !== result.cardId) return session;
  if (result.dueAgainToday) {
    return {
      ...session,
      queue: [...rest, { ...current, intervals: AFTER_AGAIN_INTERVALS }],
      reviewed: session.reviewed + 1,
    };
  }
  return { ...session, queue: rest, answered: session.answered + 1, reviewed: session.reviewed + 1 };
}

/** The header's "n / total": the card on screen, never past the total. */
export function position(session: ReviewSession): number {
  return Math.min(session.answered + 1, session.total);
}
