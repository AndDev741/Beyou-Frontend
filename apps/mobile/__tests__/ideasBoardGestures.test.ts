/**
 * What each touch on the Ideas board does, without React or a device: a quick tap opens the note,
 * a held note follows the finger at the board's zoom, a moved finger pans, two fingers pinch, and
 * a drag the system takes away is not saved.
 */
import {
  LONG_PRESS_MS,
  createBoardGestures,
  type BoardGestureCallbacks,
} from '../src/ideas/boardGestures';
import type { BoardView } from '../src/ideas/boardMath';

function setup(initial: BoardView = { x: 0, y: 0, scale: 1 }, noteUnder: string | null = 'n1') {
  let view = initial;
  const calls = {
    tap: jest.fn(),
    dragStart: jest.fn(),
    dragMove: jest.fn(),
    dragEnd: jest.fn(),
  };
  const callbacks: BoardGestureCallbacks = {
    getView: () => view,
    setView: (next) => {
      view = next;
    },
    hitTest: () => noteUnder,
    onTap: calls.tap,
    onDragStart: calls.dragStart,
    onDragMove: calls.dragMove,
    onDragEnd: calls.dragEnd,
  };
  const gestures = createBoardGestures(callbacks);
  return { gestures, calls, view: () => view };
}

const finger = (x: number, y: number, id = 1) => ({ id, x, y });

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('one finger', () => {
  it('taps a note open when it lifts before the long press', () => {
    const { gestures, calls } = setup();
    gestures.down([finger(10, 10)]);
    jest.advanceTimersByTime(LONG_PRESS_MS - 50);
    gestures.up([]);

    expect(calls.tap).toHaveBeenCalledWith('n1');
    expect(calls.dragStart).not.toHaveBeenCalled();
    expect(gestures.phase()).toBe('idle');
  });

  it('reports a tap on empty board as null', () => {
    const { gestures, calls } = setup(undefined, null);
    gestures.down([finger(10, 10)]);
    jest.advanceTimersByTime(LONG_PRESS_MS * 2);
    gestures.up([]);
    expect(calls.tap).toHaveBeenCalledWith(null);
    expect(calls.dragStart).not.toHaveBeenCalled();
  });

  it('pans the board when the finger moves, even from a note', () => {
    const { gestures, calls, view } = setup({ x: 5, y: 5, scale: 0.5 });
    gestures.down([finger(100, 100)]);
    gestures.move([finger(103, 102)]); // inside the slop: nothing yet
    expect(view()).toEqual({ x: 5, y: 5, scale: 0.5 });
    gestures.move([finger(140, 70)]);
    expect(view()).toEqual({ x: 45, y: -25, scale: 0.5 });

    jest.advanceTimersByTime(LONG_PRESS_MS * 2);
    gestures.up([]);
    expect(calls.dragStart).not.toHaveBeenCalled();
    expect(calls.tap).not.toHaveBeenCalled();
  });

  it('lifts a held note and moves it by the finger travel divided by the zoom', () => {
    const { gestures, calls } = setup({ x: 0, y: 0, scale: 0.5 });
    gestures.down([finger(100, 100)]);
    jest.advanceTimersByTime(LONG_PRESS_MS);
    expect(calls.dragStart).toHaveBeenCalledWith('n1');

    gestures.move([finger(130, 80)]);
    expect(calls.dragMove).toHaveBeenLastCalledWith({ x: 60, y: -40 });

    gestures.up([]);
    expect(calls.dragEnd).toHaveBeenCalledWith('n1', { x: 60, y: -40 }, true);
    expect(calls.tap).not.toHaveBeenCalled();
  });

  it('keeps a drag on its own finger when a second one lands', () => {
    const { gestures, calls, view } = setup();
    gestures.down([finger(0, 0)]);
    jest.advanceTimersByTime(LONG_PRESS_MS);
    gestures.down([finger(0, 0), finger(200, 200, 2)]);
    gestures.move([finger(20, 10), finger(260, 260, 2)]);

    expect(gestures.phase()).toBe('dragging');
    expect(view()).toEqual({ x: 0, y: 0, scale: 1 });
    expect(calls.dragMove).toHaveBeenLastCalledWith({ x: 20, y: 10 });
  });

  it('does not save a drag the system cancelled', () => {
    const { gestures, calls } = setup();
    gestures.down([finger(0, 0)]);
    jest.advanceTimersByTime(LONG_PRESS_MS);
    gestures.move([finger(50, 0)]);
    gestures.cancel();
    expect(calls.dragEnd).toHaveBeenCalledWith('n1', { x: 50, y: 0 }, false);
  });

  it('treats the same first finger reported twice as one touch', () => {
    const { gestures, calls } = setup();
    gestures.down([finger(10, 10)]);
    gestures.down([finger(10, 10)]); // grant, then start
    gestures.up([]);
    gestures.up([]); // end, then release
    expect(calls.tap).toHaveBeenCalledTimes(1);
  });
});

describe('two fingers', () => {
  it('pinches around the point between them and never lifts a note', () => {
    const { gestures, calls, view } = setup();
    gestures.down([finger(100, 100)]);
    gestures.down([finger(100, 100), finger(200, 100, 2)]);
    jest.advanceTimersByTime(LONG_PRESS_MS * 2);
    gestures.move([finger(50, 100), finger(250, 100, 2)]);

    expect(calls.dragStart).not.toHaveBeenCalled();
    expect(view().scale).toBeCloseTo(1.6); // 2× asked, clamped
    // The board point that was under the midpoint (150, 100) is still there.
    expect(view().x + 150 * view().scale).toBeCloseTo(150);
  });

  it('carries on as a pan when one finger of the pinch lifts', () => {
    const { gestures, view } = setup();
    gestures.down([finger(100, 100), finger(200, 100, 2)]);
    gestures.up([finger(200, 100, 2)]);
    expect(gestures.phase()).toBe('panning');
    gestures.move([finger(230, 140, 2)]);
    expect(view()).toEqual({ x: 30, y: 40, scale: 1 });
    gestures.up([]);
    expect(gestures.phase()).toBe('idle');
  });
});
