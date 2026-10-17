import type { QuickNote, QuickNotePosition } from '@beyou/types/quickNote/quickNote';
import { QUICK_NOTE_COORD_LIMIT } from '@beyou/types/quickNote/quickNote';

/** Back to front: the order a board draws in. Creation breaks ties, as on the server. */
export const byStackOrder = (a: QuickNote, b: QuickNote): number =>
    a.z - b.z || a.createdAt.localeCompare(b.createdAt);

/** The z that puts a note in front of everything on the board. */
export function nextZ(notes: readonly QuickNote[]): number {
    return notes.reduce((max, n) => Math.max(max, n.z), 0) + 1;
}

const clampCoord = (value: number) =>
    Math.max(-QUICK_NOTE_COORD_LIMIT, Math.min(QUICK_NOTE_COORD_LIMIT, Math.round(value)));

/**
 * What a drop saves: the note's new spot, rounded and inside the board's limits, and a z that
 * brings it to the front. Both clients go through this, so a drag on the phone and a drag on the
 * web send the server the same thing.
 */
export function dropPosition(
    notes: readonly QuickNote[],
    id: string,
    at: { x: number; y: number },
): QuickNotePosition {
    const others = notes.filter((n) => n.id !== id);
    const current = notes.find((n) => n.id === id);
    // Already in front: keep its z, so a nudge does not keep climbing the numbers.
    const inFront = current != null && others.every((n) => n.z < current.z);
    return {
        id,
        x: clampCoord(at.x),
        y: clampCoord(at.y),
        z: inFront ? current.z : nextZ(others),
    };
}

/** The task's own caps (`CreateTaskRequestDTO`). */
const TASK_NAME_MAX = 255;
const TASK_DESCRIPTION_MAX = 255;
const TASK_NAME_MIN = 2;

/**
 * What "make it a task" fills the task form with: the first line names it, the rest describes it,
 * each cut to what the task accepts. A one-line note longer than a name keeps its tail in the
 * description rather than losing it. The person still sees and edits both before saving.
 */
export function quickNoteTaskPrefill(text: string): { name: string; description: string } {
    const trimmed = text.trim();
    const newline = trimmed.indexOf('\n');
    let name = (newline === -1 ? trimmed : trimmed.slice(0, newline)).trim();
    let rest = newline === -1 ? '' : trimmed.slice(newline + 1).trim();
    if (name.length > TASK_NAME_MAX) {
        const cut = name.lastIndexOf(' ', TASK_NAME_MAX);
        const at = cut >= TASK_NAME_MIN ? cut : TASK_NAME_MAX;
        rest = [name.slice(at).trim(), rest].filter(Boolean).join('\n');
        name = name.slice(0, at).trim();
    }
    return { name, description: rest.slice(0, TASK_DESCRIPTION_MAX) };
}
