/**
 * The Ideas page: quick notes on a free board, like post-its on a corkboard.
 *
 * Wire names match the backend's `QuickNoteResponseDTO` and friends (checked in `@beyou/api`'s
 * contractChecks). The sizes and limits below mirror `QuickNote` on the server; the server uses
 * the note size to find a free spot and to tidy the board, so a client that drew notes at a
 * different size would see them overlap.
 */

/** Tidy groups notes in this order, which is also the order of the swatches. */
export const QUICK_NOTE_COLORS = ["YELLOW", "PINK", "BLUE", "GREEN", "PURPLE", "ORANGE"] as const;

export type QuickNoteColor = (typeof QUICK_NOTE_COLORS)[number];

/** A post-it is short. Also keeps a converted note inside the task's 255 + 255 characters. */
export const QUICK_NOTE_TEXT_MAX = 500;
/** Active notes per account. Archived ones do not count. */
export const QUICK_NOTE_MAX_ACTIVE = 200;
/** Board coordinates are integers in [-limit, limit]. */
export const QUICK_NOTE_COORD_LIMIT = 100000;
/** A note's size in board units. */
export const QUICK_NOTE_WIDTH = 200;
export const QUICK_NOTE_HEIGHT = 160;
/** The grid the server places new notes on and tidies the board into. */
export const QUICK_NOTE_GRID_GAP = 24;
export const QUICK_NOTE_GRID_COLUMNS = 5;

export type QuickNote = {
    id: string;
    text: string;
    color: QuickNoteColor;
    /** Top-left corner in board units. */
    x: number;
    y: number;
    /** Stacking order: a higher z draws in front. */
    z: number;
    /** Set when the note left the board. Archived notes are listed apart. */
    archivedAt: string | null;
    /** The task this note became, if it was converted. Null again if that task was deleted. */
    convertedTaskId: string | null;
    createdAt: string;
    updatedAt: string;
};

/**
 * A new note. Send `x` and `y` together to drop it on a spot; leave both out and the server puts
 * it in the board's first free cell.
 */
export type QuickNoteCreateInput = {
    text: string;
    color?: QuickNoteColor;
    x?: number;
    y?: number;
};

export type QuickNoteEditInput = {
    text: string;
    color: QuickNoteColor;
};

export type QuickNotePosition = {
    id: string;
    x: number;
    y: number;
    z: number;
};

/** What converting a note answers: the note, now archived, and the task it became. */
export type QuickNoteTaskConversion = {
    note: QuickNote;
    taskId: string;
};
