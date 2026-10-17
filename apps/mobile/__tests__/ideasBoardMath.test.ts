/**
 * The Ideas board's arithmetic on the phone: screen ↔ board units, pinch around the fingers,
 * the zoom limits, fitting the notes and finding the note under a finger. A mistake in any of
 * these puts a dropped note somewhere other than under the finger that let it go.
 */
import type { QuickNote } from '@beyou/types/quickNote/quickNote';
import {
  MAX_SCALE,
  MIN_SCALE,
  boardDelta,
  centerOn,
  clampScale,
  fitView,
  layerTransform,
  noteAt,
  panView,
  pinchOf,
  pinchView,
  toBoard,
} from '../src/ideas/boardMath';

const note = (id: string, x: number, y: number, z = 0): QuickNote => ({
  id,
  text: id,
  color: 'YELLOW',
  x,
  y,
  z,
  archivedAt: null,
  convertedTaskId: null,
  createdAt: '2026-10-17T10:00:00Z',
  updatedAt: '2026-10-17T10:00:00Z',
});

/** Where a board point lands on screen, the inverse of toBoard. */
const toScreen = (view: { x: number; y: number; scale: number }, p: { x: number; y: number }) => ({
  x: view.x + p.x * view.scale,
  y: view.y + p.y * view.scale,
});

describe('screen and board units', () => {
  it('divides a finger travel by the zoom to get the board distance', () => {
    expect(boardDelta({ x: 50, y: -20 }, 0.5)).toEqual({ x: 100, y: -40 });
    expect(boardDelta({ x: 50, y: -20 }, 1)).toEqual({ x: 50, y: -20 });
    expect(boardDelta({ x: 30, y: 15 }, 1.5)).toEqual({ x: 20, y: 10 });
  });

  it('maps a screen point to the board through the view', () => {
    const view = { x: 40, y: -60, scale: 0.5 };
    expect(toBoard(view, { x: 140, y: 40 })).toEqual({ x: 200, y: 200 });
  });

  it('pans by the finger travel, keeping the zoom', () => {
    expect(panView({ x: 10, y: 20, scale: 0.8 }, { x: 5, y: -7 })).toEqual({ x: 15, y: 13, scale: 0.8 });
  });
});

describe('pinch zoom', () => {
  it('keeps the board point under the fingers where it was', () => {
    const start = { x: 30, y: 50, scale: 1 };
    const from = pinchOf({ x: 100, y: 200 }, { x: 200, y: 200 });
    const to = pinchOf({ x: 60, y: 260 }, { x: 210, y: 260 });
    const next = pinchView(start, from, to);

    expect(next.scale).toBeCloseTo(1.5);
    const anchor = toBoard(start, from.mid);
    const after = toScreen(next, anchor);
    expect(after.x).toBeCloseTo(to.mid.x);
    expect(after.y).toBeCloseTo(to.mid.y);
  });

  it('pans while pinching when both fingers move together', () => {
    const start = { x: 0, y: 0, scale: 1 };
    const from = pinchOf({ x: 100, y: 100 }, { x: 200, y: 100 });
    const to = pinchOf({ x: 140, y: 160 }, { x: 240, y: 160 });
    expect(pinchView(start, from, to)).toEqual({ x: 40, y: 60, scale: 1 });
  });

  it('never zooms past the limits', () => {
    const start = { x: 0, y: 0, scale: 1 };
    const close = pinchOf({ x: 100, y: 100 }, { x: 110, y: 100 });
    const far = pinchOf({ x: 0, y: 100 }, { x: 1000, y: 100 });
    expect(pinchView(start, far, close).scale).toBe(MIN_SCALE);
    expect(pinchView(start, close, far).scale).toBe(MAX_SCALE);
    expect(clampScale(0.1)).toBe(0.4);
    expect(clampScale(9)).toBe(1.6);
  });

  it('ignores a pinch with no spread to measure', () => {
    const start = { x: 5, y: 5, scale: 1 };
    const same = pinchOf({ x: 100, y: 100 }, { x: 100, y: 100 });
    expect(pinchView(start, same, pinchOf({ x: 0, y: 0 }, { x: 10, y: 0 }))).toBe(start);
  });
});

describe('fitting the board', () => {
  const viewport = { width: 360, height: 600 };

  it('shows every note, centred, without zooming in past real size', () => {
    const view = fitView([note('a', 0, 0)], viewport);
    expect(view.scale).toBe(1);
    // A 200 × 160 note in the middle of the screen.
    expect(view.x).toBe(80);
    expect(view.y).toBe(220);
  });

  it('zooms out until a wide board fits inside the padding', () => {
    const notes = [note('a', 0, 0), note('b', 2 * 224, 0)];
    const view = fitView(notes, viewport);
    // 648 board units across 312 points of room.
    expect(view.scale).toBeCloseTo(312 / 648);
    const left = toScreen(view, { x: 0, y: 0 });
    const right = toScreen(view, { x: 2 * 224 + 200, y: 160 });
    expect(left.x).toBeCloseTo(24);
    expect(right.x).toBeCloseTo(viewport.width - 24);
  });

  it('stops at the smallest zoom for a board too big to fit', () => {
    const notes = [note('a', -5000, 0), note('b', 5000, 3000)];
    expect(fitView(notes, viewport).scale).toBe(MIN_SCALE);
  });

  it('shows the origin of an empty board, where the first note goes', () => {
    expect(fitView([], viewport)).toEqual({ x: 24, y: 24, scale: 1 });
  });

  it('centres one note at the current zoom', () => {
    const view = centerOn({ x: 448, y: 184 }, viewport, 0.5);
    const middle = toScreen(view, { x: 448 + 100, y: 184 + 80 });
    expect(view.scale).toBe(0.5);
    expect(middle).toEqual({ x: 180, y: 300 });
  });
});

describe('the note under a finger', () => {
  const view = { x: 0, y: 0, scale: 1 };

  it('finds the front note where two overlap', () => {
    const notes = [note('back', 0, 0, 1), note('front', 100, 100, 2)];
    expect(noteAt(notes, view, { x: 150, y: 120 })?.id).toBe('front');
    expect(noteAt(notes, view, { x: 50, y: 50 })?.id).toBe('back');
  });

  it('answers null on empty board', () => {
    expect(noteAt([note('a', 0, 0)], view, { x: 250, y: 50 })).toBeNull();
  });

  it('reads the finger through the zoom and the pan', () => {
    const zoomed = { x: 100, y: 100, scale: 0.5 };
    // Board (400, 0) is at screen (300, 100).
    expect(noteAt([note('a', 400, 0)], zoomed, { x: 310, y: 110 })?.id).toBe('a');
    expect(noteAt([note('a', 400, 0)], zoomed, { x: 290, y: 110 })).toBeNull();
  });
});

describe('the layer transform', () => {
  /**
   * React Native scales a view around its centre, applying the list's first entry last (as CSS
   * does). Played back by hand, the transform must put board point p at view + p × scale.
   */
  it('lands every board point where the view says, whatever the zoom', () => {
    const width = 360;
    const height = 640;
    const view = { x: -120, y: 75, scale: 0.6 };
    const [tx, ty, s] = layerTransform(view.x, view.y, view.scale, width, height);
    const centre = { x: width / 2, y: height / 2 };
    for (const p of [{ x: 0, y: 0 }, { x: 300, y: 500 }, { x: -50, y: 20 }]) {
      const drawn = {
        x: centre.x + tx.translateX + s.scale * (p.x - centre.x),
        y: centre.y + ty.translateY + s.scale * (p.y - centre.y),
      };
      const expected = toScreen(view, p);
      expect(drawn.x).toBeCloseTo(expected.x);
      expect(drawn.y).toBeCloseTo(expected.y);
    }
  });
});
