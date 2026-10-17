import {
  QUICK_NOTE_HEIGHT,
  QUICK_NOTE_WIDTH,
  type QuickNote,
} from '@beyou/types/quickNote/quickNote';

/**
 * The arithmetic behind the Ideas board on the phone, kept apart from React so each rule can be
 * tested on its own.
 *
 * Two spaces meet here. Board units are what the server stores (a note is 200 × 160 of them).
 * Viewport points are pixels inside the board's own view, measured from its top-left corner.
 * `BoardView` says how one maps onto the other: viewport = translate + board × scale.
 */

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type BoardView = { x: number; y: number; scale: number };

/** Small enough to see a crowded board at once, big enough to read a note on a phone. */
export const MIN_SCALE = 0.4;
export const MAX_SCALE = 1.6;
/** Room left around the notes when the board fits them on screen. */
export const FIT_PADDING = 24;

export const clampScale = (scale: number): number => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

/** Where a viewport point lands on the board. */
export function toBoard(view: BoardView, point: Point): Point {
  return { x: (point.x - view.x) / view.scale, y: (point.y - view.y) / view.scale };
}

/**
 * A finger's travel on screen as board units, which is how far a dragged note moves. Zoomed out
 * to half size, an inch of finger is two inches of board.
 */
export function boardDelta(screenDelta: Point, scale: number): Point {
  return { x: screenDelta.x / scale, y: screenDelta.y / scale };
}

/** One finger on the board: the whole board follows it. */
export function panView(start: BoardView, screenDelta: Point): BoardView {
  return { scale: start.scale, x: start.x + screenDelta.x, y: start.y + screenDelta.y };
}

/** Two fingers, read as the point between them and how far apart they are. */
export type Pinch = { mid: Point; distance: number };

export function pinchOf(a: Point, b: Point): Pinch {
  return {
    mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    distance: Math.hypot(b.x - a.x, b.y - a.y),
  };
}

/**
 * Two fingers: the board scales by how much they spread, around the spot between them. The board
 * point that sat under their midpoint when the pinch began stays under it, so moving both fingers
 * together pans as well.
 */
export function pinchView(start: BoardView, from: Pinch, to: Pinch): BoardView {
  if (from.distance <= 0 || to.distance <= 0) return start;
  const scale = clampScale(start.scale * (to.distance / from.distance));
  const anchor = toBoard(start, from.mid);
  return { scale, x: to.mid.x - anchor.x * scale, y: to.mid.y - anchor.y * scale };
}

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

export function notesBounds(notes: readonly QuickNote[]): Bounds | null {
  if (notes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const note of notes) {
    minX = Math.min(minX, note.x);
    minY = Math.min(minY, note.y);
    maxX = Math.max(maxX, note.x + QUICK_NOTE_WIDTH);
    maxY = Math.max(maxY, note.y + QUICK_NOTE_HEIGHT);
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Every note on screen, centred. Never zooms in past 1: two notes on an empty board stay at
 * their real size instead of filling the phone. An empty board shows its origin, where the
 * server puts the first note.
 */
export function fitView(notes: readonly QuickNote[], viewport: Size, padding = FIT_PADDING): BoardView {
  const bounds = notesBounds(notes);
  if (!bounds || viewport.width <= 0 || viewport.height <= 0) {
    return { x: padding, y: padding, scale: 1 };
  }
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const room = {
    width: Math.max(1, viewport.width - padding * 2),
    height: Math.max(1, viewport.height - padding * 2),
  };
  const scale = clampScale(Math.min(room.width / width, room.height / height, 1));
  return {
    scale,
    x: viewport.width / 2 - (bounds.minX + width / 2) * scale,
    y: viewport.height / 2 - (bounds.minY + height / 2) * scale,
  };
}

/** The same zoom, moved so this note sits in the middle of the screen. */
export function centerOn(note: Pick<QuickNote, 'x' | 'y'>, viewport: Size, scale: number): BoardView {
  return {
    scale,
    x: viewport.width / 2 - (note.x + QUICK_NOTE_WIDTH / 2) * scale,
    y: viewport.height / 2 - (note.y + QUICK_NOTE_HEIGHT / 2) * scale,
  };
}

/**
 * The note under a viewport point, the front one when they overlap. `notes` comes back to front,
 * as the board draws them, so the search runs from the end.
 */
export function noteAt(notes: readonly QuickNote[], view: BoardView, point: Point): QuickNote | null {
  const at = toBoard(view, point);
  for (let i = notes.length - 1; i >= 0; i -= 1) {
    const note = notes[i];
    if (
      at.x >= note.x &&
      at.x <= note.x + QUICK_NOTE_WIDTH &&
      at.y >= note.y &&
      at.y <= note.y + QUICK_NOTE_HEIGHT
    ) {
      return note;
    }
  }
  return null;
}

/**
 * The transform that draws the board layer for a view. React Native scales around a view's
 * centre, and the layer fills the viewport, so the translate makes up for the centre moving:
 * a board point p ends up at view + p × scale, the same mapping every function above uses.
 *
 * A worklet, because the layer's animated style runs it on the UI thread.
 */
export type LayerTransform = [{ translateX: number }, { translateY: number }, { scale: number }];

export function layerTransform(
  x: number,
  y: number,
  scale: number,
  width: number,
  height: number,
): LayerTransform {
  'worklet';
  return [
    { translateX: x - ((1 - scale) * width) / 2 },
    { translateY: y - ((1 - scale) * height) / 2 },
    { scale },
  ];
}
