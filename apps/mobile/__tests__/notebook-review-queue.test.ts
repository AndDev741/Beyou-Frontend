import type { DueCard } from '@beyou/types/notebook/notebook';
import { AFTER_AGAIN_INTERVALS, afterAnswer, position, startSession } from '../src/notebook/reviewQueue';

const card = (id: string): DueCard => ({
  id, pageId: 'p', pageTitle: 'Trees', topicId: 't', topicTitle: 'DS', front: `${id}?`, back: `${id}!`,
  sourceLabel: null, intervals: { AGAIN: 0, HARD: 2, GOOD: 4, EASY: 9 },
});

describe('review queue', () => {
  it('an answer scheduled for a later day takes the card out and moves the position', () => {
    const session = afterAnswer(startSession([card('a'), card('b')]), {
      cardId: 'a', dueOn: '2026-10-05', intervalDays: 1, dueAgainToday: false,
    });

    expect(session.queue.map((c) => c.id)).toEqual(['b']);
    expect(position(session)).toBe(2);
    expect(session.reviewed).toBe(1);
  });

  /** AGAIN sends the card to the back, and the "n / total" header must not count it twice. */
  it('again puts the card at the end without growing the total', () => {
    const session = afterAnswer(startSession([card('a'), card('b')]), {
      cardId: 'a', dueOn: '2026-10-04', intervalDays: 0, dueAgainToday: true,
    });

    expect(session.queue.map((c) => c.id)).toEqual(['b', 'a']);
    expect(session.total).toBe(2);
    expect(position(session)).toBe(1);
    expect(session.queue[1].intervals).toEqual(AFTER_AGAIN_INTERVALS);
  });

  it('ignores an answer for a card that is not the one on screen', () => {
    const start = startSession([card('a')]);
    expect(afterAnswer(start, { cardId: 'zzz', dueOn: 'x', intervalDays: 1, dueAgainToday: false })).toBe(start);
  });
});
