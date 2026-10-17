import {
  boardDelta,
  panView,
  pinchOf,
  pinchView,
  type BoardView,
  type Pinch,
  type Point,
} from './boardMath';

/**
 * What the fingers on the Ideas board mean, as a small state machine with no React and no
 * native module in it. `useBoardGestures` feeds it from a `PanResponder`; the tests feed it
 * plain points.
 *
 *   one finger, lifted quickly ............ a tap: opens the note under it (or nothing)
 *   one finger, moved ...................... pans the board, even if it started on a note
 *   one finger held still on a note ........ after LONG_PRESS_MS the note lifts and follows it
 *   two fingers ............................ pinch zoom around the point between them
 *
 * A drag ignores any extra finger, so a thumb resting on the glass cannot turn it into a pinch.
 */

/** A finger, in viewport points (inside the board's own view). */
export type BoardTouch = { id: number | string; x: number; y: number };

export type BoardGestureCallbacks = {
  getView: () => BoardView;
  setView: (view: BoardView) => void;
  /** The note under a viewport point, front first, or null on empty board. */
  hitTest: (point: Point) => string | null;
  onTap: (noteId: string | null) => void;
  onDragStart: (noteId: string) => void;
  /** How far the lifted note has travelled, in board units. */
  onDragMove: (delta: Point) => void;
  /** `committed` is false when the system took the touch away mid-drag. */
  onDragEnd: (noteId: string, delta: Point, committed: boolean) => void;
};

/** Long enough that a scroll never lifts a note by accident; short enough not to feel slow. */
export const LONG_PRESS_MS = 250;
/** Movement under this still counts as holding still (or as a tap). */
export const TOUCH_SLOP = 8;

type State =
  | { kind: 'idle' }
  | {
      kind: 'pending';
      touchId: BoardTouch['id'];
      start: Point;
      last: Point;
      view: BoardView;
      noteId: string | null;
    }
  | { kind: 'panning'; touchId: BoardTouch['id']; start: Point; view: BoardView }
  | {
      kind: 'dragging';
      touchId: BoardTouch['id'];
      noteId: string;
      start: Point;
      scale: number;
      delta: Point;
    }
  | { kind: 'pinching'; ids: [BoardTouch['id'], BoardTouch['id']]; from: Pinch; view: BoardView }
  /** The gesture is over but fingers are still down; waits for all of them to lift. */
  | { kind: 'done' };

export type BoardGestures = {
  /** A finger went down. `touches` is every finger on the board now. */
  down: (touches: BoardTouch[]) => void;
  move: (touches: BoardTouch[]) => void;
  /** A finger lifted. `remaining` is every finger still on the board. */
  up: (remaining: BoardTouch[]) => void;
  /** The system took the touch away (another responder, an incoming call). */
  cancel: () => void;
  /** The current phase, for tests and for debugging on a device. */
  phase: () => State['kind'];
};

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const pointOf = (touch: BoardTouch): Point => ({ x: touch.x, y: touch.y });

export function createBoardGestures(callbacks: BoardGestureCallbacks): BoardGestures {
  let state: State = { kind: 'idle' };
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const startPinch = (a: BoardTouch, b: BoardTouch) => {
    clearTimer();
    state = {
      kind: 'pinching',
      ids: [a.id, b.id],
      from: pinchOf(pointOf(a), pointOf(b)),
      view: callbacks.getView(),
    };
  };

  const startPan = (touch: BoardTouch) => {
    state = { kind: 'panning', touchId: touch.id, start: pointOf(touch), view: callbacks.getView() };
  };

  const lift = () => {
    timer = null;
    if (state.kind !== 'pending' || state.noteId === null) return;
    // From where the finger is now, so the note does not jump by the slop it already drifted.
    state = {
      kind: 'dragging',
      touchId: state.touchId,
      noteId: state.noteId,
      start: state.last,
      scale: callbacks.getView().scale,
      delta: { x: 0, y: 0 },
    };
    callbacks.onDragStart(state.noteId);
  };

  const down = (touches: BoardTouch[]) => {
    if (touches.length === 0) return;
    switch (state.kind) {
      case 'idle': {
        if (touches.length >= 2) {
          startPinch(touches[0], touches[1]);
          return;
        }
        const [touch] = touches;
        const start = pointOf(touch);
        const noteId = callbacks.hitTest(start);
        state = { kind: 'pending', touchId: touch.id, start, last: start, view: callbacks.getView(), noteId };
        if (noteId !== null) timer = setTimeout(lift, LONG_PRESS_MS);
        return;
      }
      case 'pending':
      case 'panning':
        // The same first finger reported again (a responder grant and its start both say so).
        if (touches.length < 2) return;
        startPinch(touches[0], touches[1]);
        return;
      default:
        // Dragging keeps its one finger; a pinch keeps its two; a third finger changes nothing.
        return;
    }
  };

  const move = (touches: BoardTouch[]) => {
    switch (state.kind) {
      case 'pending': {
        const { touchId } = state;
        const touch = touches.find((item) => item.id === touchId);
        if (!touch) return;
        const at = pointOf(touch);
        state = { ...state, last: at };
        if (distance(at, state.start) <= TOUCH_SLOP) return;
        clearTimer();
        // The pan counts from where the finger first landed, so the slop is not lost.
        const { start, view } = state;
        state = { kind: 'panning', touchId, start, view };
        callbacks.setView(panView(view, { x: at.x - start.x, y: at.y - start.y }));
        return;
      }
      case 'panning': {
        const { touchId, start, view } = state;
        const touch = touches.find((item) => item.id === touchId);
        if (!touch) return;
        callbacks.setView(panView(view, { x: touch.x - start.x, y: touch.y - start.y }));
        return;
      }
      case 'dragging': {
        const { touchId, start, scale } = state;
        const touch = touches.find((item) => item.id === touchId);
        if (!touch) return;
        const delta = boardDelta({ x: touch.x - start.x, y: touch.y - start.y }, scale);
        state = { ...state, delta };
        callbacks.onDragMove(delta);
        return;
      }
      case 'pinching': {
        const [idA, idB] = state.ids;
        const a = touches.find((item) => item.id === idA);
        const b = touches.find((item) => item.id === idB);
        if (!a || !b) return;
        callbacks.setView(pinchView(state.view, state.from, pinchOf(pointOf(a), pointOf(b))));
        return;
      }
      default:
        return;
    }
  };

  const up = (remaining: BoardTouch[]) => {
    switch (state.kind) {
      case 'pending': {
        const { touchId, noteId } = state;
        if (remaining.some((item) => item.id === touchId)) return;
        clearTimer();
        state = remaining.length === 0 ? { kind: 'idle' } : { kind: 'done' };
        callbacks.onTap(noteId);
        return;
      }
      case 'panning': {
        if (remaining.length === 0) {
          state = { kind: 'idle' };
          return;
        }
        // The panning finger left but another stayed: carry on with that one.
        const { touchId } = state;
        if (!remaining.some((item) => item.id === touchId)) startPan(remaining[0]);
        return;
      }
      case 'dragging': {
        const { touchId, noteId, delta } = state;
        if (remaining.some((item) => item.id === touchId)) return;
        state = remaining.length === 0 ? { kind: 'idle' } : { kind: 'done' };
        callbacks.onDragEnd(noteId, delta, true);
        return;
      }
      case 'pinching': {
        if (remaining.length === 0) {
          state = { kind: 'idle' };
          return;
        }
        if (remaining.length === 1) {
          // Lifting one finger of a pinch leaves a pan, from wherever the board is now.
          startPan(remaining[0]);
          return;
        }
        startPinch(remaining[0], remaining[1]);
        return;
      }
      case 'done':
        if (remaining.length === 0) state = { kind: 'idle' };
        return;
      default:
        return;
    }
  };

  const cancel = () => {
    clearTimer();
    if (state.kind === 'dragging') {
      const { noteId, delta } = state;
      state = { kind: 'idle' };
      callbacks.onDragEnd(noteId, delta, false);
      return;
    }
    state = { kind: 'idle' };
  };

  return { down, move, up, cancel, phase: () => state.kind };
}
