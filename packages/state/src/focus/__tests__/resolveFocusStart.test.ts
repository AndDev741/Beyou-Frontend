import { describe, expect, it } from 'vitest';
import type { FocusItem } from '../focusItems';
import { minutesOfDay, resolveFocusStart } from '../resolveFocusStart';

const DATE = '2026-08-28';
const at = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const item = (
  groupId: string,
  startTime?: string,
  endTime?: string,
  checks: unknown[] = [],
): FocusItem =>
  ({ groupId, type: 'habit', itemId: `h-${groupId}`, sectionName: 'S', startTime, endTime, checks } as FocusItem);

const checked = [{ checkDate: DATE, checked: true }];
const skipped = [{ checkDate: DATE, skipped: true }];

describe('resolveFocusStart with times', () => {
  const day = [
    item('morning', '06:00', '07:00'),
    item('noon', '12:00', '13:00'),
    item('evening', '20:00', '21:00'),
  ];

  it('picks the window the clock is inside', () => {
    expect(resolveFocusStart(day, at('12:30'), DATE)).toEqual({ index: 1, reason: 'now' });
  });

  it('the window opens on its start minute and closes before its end', () => {
    // End-exclusive, so two back-to-back items never both claim the same minute.
    expect(resolveFocusStart(day, at('12:00'), DATE)).toEqual({ index: 1, reason: 'now' });
    expect(resolveFocusStart(day, at('13:00'), DATE)).toEqual({ index: 2, reason: 'next' });
  });

  it('in a gap it points at what comes next, and says it is not running', () => {
    expect(resolveFocusStart(day, at('09:00'), DATE)).toEqual({ index: 1, reason: 'next' });
  });

  it('before the first window, the first window is next', () => {
    expect(resolveFocusStart(day, at('03:00'), DATE)).toEqual({ index: 0, reason: 'next' });
  });

  it('after every window it lands on the LATEST one still open, not the first', () => {
    // Opening the app at eleven at night should show this evening, not this morning.
    expect(resolveFocusStart(day, at('23:00'), DATE)).toEqual({ index: 2, reason: 'late' });
  });

  // A routine whose sections sit out of chronological order. Split into two cases on purpose:
  // the gap and the late branches sort independently, and one assertion failing would hide
  // the other inside a single test.
  const outOfOrder = [
    item('evening', '20:00', '21:00'),
    item('morning', '06:00', '07:00'),
    item('noon', '12:00', '13:00'),
  ];

  it('in a gap, "next" is by clock even when card order disagrees', () => {
    // Noon is next; evening merely happens to sit first in the array.
    expect(resolveFocusStart(outOfOrder, at('09:00'), DATE)).toEqual({ index: 2, reason: 'next' });
  });

  it('when late, the most recent is by clock even when card order disagrees', () => {
    // Past everything: the evening is the most recent, and it lives at array index 0.
    expect(resolveFocusStart(outOfOrder, at('23:00'), DATE)).toEqual({ index: 0, reason: 'late' });
  });

  it('ignores what is already checked or skipped when choosing', () => {
    const partly = [
      item('morning', '06:00', '07:00', checked),
      item('noon', '12:00', '13:00', skipped),
      item('evening', '20:00', '21:00'),
    ];

    // Noon is skipped, so 12:30 is not "now" for it; the evening is what is left.
    expect(resolveFocusStart(partly, at('12:30'), DATE)).toEqual({ index: 2, reason: 'next' });
  });

  it('reports the day complete when nothing is open', () => {
    const done = [item('a', '06:00', '07:00', checked), item('b', '20:00', '21:00', skipped)];

    expect(resolveFocusStart(done, at('12:00'), DATE)).toEqual({ index: -1, reason: 'complete' });
  });

  it("yesterday's check does not close today's item", () => {
    const stale = [item('morning', '06:00', '07:00', [{ checkDate: '2026-08-27', checked: true }])];

    expect(resolveFocusStart(stale, at('06:30'), DATE)).toEqual({ index: 0, reason: 'now' });
  });
});

describe('resolveFocusStart across midnight', () => {
  const night = [item('sleep', '23:00', '01:00')];

  it('is inside the window on both sides of midnight', () => {
    expect(resolveFocusStart(night, at('23:30'), DATE)).toEqual({ index: 0, reason: 'now' });
    expect(resolveFocusStart(night, at('00:30'), DATE)).toEqual({ index: 0, reason: 'now' });
  });

  it('is outside it in the middle of the day', () => {
    // Not 'now', and 23:00 is still ahead, so it is what comes next.
    expect(resolveFocusStart(night, at('14:00'), DATE)).toEqual({ index: 0, reason: 'next' });
  });
});

describe('resolveFocusStart with no times (LIST, and half-scheduled DAILY)', () => {
  it('takes the first open item and says the order chose it, not the clock', () => {
    // The base case, not a fallback: this is the whole of the LIST behaviour, and the clock
    // has no say in it at any hour.
    const list = [item('a'), item('b'), item('c')];

    expect(resolveFocusStart(list, at('03:00'), DATE)).toEqual({ index: 0, reason: 'order' });
    expect(resolveFocusStart(list, at('17:00'), DATE)).toEqual({ index: 0, reason: 'order' });
  });

  it('skips over what is done and keeps the reason', () => {
    const list = [item('a', undefined, undefined, checked), item('b'), item('c')];

    expect(resolveFocusStart(list, at('10:00'), DATE)).toEqual({ index: 1, reason: 'order' });
  });

  it('a mixed routine still answers by clock while anything timed is open', () => {
    const mixed = [item('untimed'), item('timed', '12:00', '13:00')];

    expect(resolveFocusStart(mixed, at('12:30'), DATE)).toEqual({ index: 1, reason: 'now' });
  });

  it('and falls back to order once the timed ones are done', () => {
    const mixed = [item('untimed'), item('timed', '12:00', '13:00', checked)];

    expect(resolveFocusStart(mixed, at('12:30'), DATE)).toEqual({ index: 0, reason: 'order' });
  });

  it('an item with a start and no end owns only its starting minute', () => {
    // Stated like that it reads oddly, but the alternative is worse: owning everything until
    // the next item would make an unscheduled afternoon belong to breakfast.
    const open = [item('a', '07:00')];

    expect(resolveFocusStart(open, at('07:00'), DATE)).toEqual({ index: 0, reason: 'now' });
    expect(resolveFocusStart(open, at('07:01'), DATE)).toEqual({ index: 0, reason: 'late' });
  });
});

describe('resolveFocusStart edge cases', () => {
  it('has nothing to point at in an empty routine', () => {
    expect(resolveFocusStart([], at('12:00'), DATE)).toEqual({ index: -1, reason: 'complete' });
  });

  it('handles a single item at every hour without throwing', () => {
    const one = [item('only', '09:00', '10:00')];

    expect(resolveFocusStart(one, at('08:00'), DATE).reason).toBe('next');
    expect(resolveFocusStart(one, at('09:30'), DATE).reason).toBe('now');
    expect(resolveFocusStart(one, at('11:00'), DATE).reason).toBe('late');
  });

  it('treats a malformed time as no window rather than as minute NaN', () => {
    const broken = [item('bad', 'not-a-time'), item('good', '12:00', '13:00')];

    expect(resolveFocusStart(broken, at('12:30'), DATE)).toEqual({ index: 1, reason: 'now' });
  });
});

describe('minutesOfDay', () => {
  it('reads the wall clock, so it moves with the browser timezone', () => {
    const noon = new Date(2026, 7, 28, 12, 34, 0);
    expect(minutesOfDay(noon)).toBe(12 * 60 + 34);

    const midnight = new Date(2026, 7, 28, 0, 0, 0);
    expect(minutesOfDay(midnight)).toBe(0);
  });
});
