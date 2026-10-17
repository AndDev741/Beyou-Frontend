import { describe, expect, it } from 'vitest';
import type { QuickNote } from '@beyou/types/quickNote/quickNote';
import { QUICK_NOTE_COLORS } from '@beyou/types/quickNote/quickNote';
import reducer, {
    archivedQuickNotesLoaded,
    quickNoteRemoved,
    quickNotesLoaded,
    quickNotesMoved,
    quickNoteUpserted,
} from '../quickNotesSlice';
import { dropPosition, nextZ, quickNoteTaskPrefill } from '../quickNoteHelpers';
import { noteColors } from '../noteColors';

const note = (id: string, z: number, extra: Partial<QuickNote> = {}): QuickNote => ({
    id,
    text: `note ${id}`,
    color: 'YELLOW',
    x: 0,
    y: 0,
    z,
    archivedAt: null,
    convertedTaskId: null,
    createdAt: `2026-10-17T10:00:0${z}Z`,
    updatedAt: `2026-10-17T10:00:0${z}Z`,
    ...extra,
});

const initial = reducer(undefined, { type: 'init' });

describe('quick notes slice', () => {
    it('keeps the board back to front whatever order the server sent', () => {
        const state = reducer(initial, quickNotesLoaded([note('c', 3), note('a', 1), note('b', 2)]));
        expect(state.active.map((n) => n.id)).toEqual(['a', 'b', 'c']);
        expect(state.loaded).toBe(true);
    });

    it('moves an archived note off the board and into an open archive list', () => {
        let state = reducer(initial, quickNotesLoaded([note('a', 1), note('b', 2)]));
        state = reducer(state, archivedQuickNotesLoaded([note('old', 0, { archivedAt: '2026-10-01T00:00:00Z' })]));
        state = reducer(state, quickNoteUpserted(note('a', 1, { archivedAt: '2026-10-17T11:00:00Z' })));
        expect(state.active.map((n) => n.id)).toEqual(['b']);
        expect(state.archived?.map((n) => n.id)).toEqual(['a', 'old']);
    });

    it('does not invent an archive list nobody opened', () => {
        let state = reducer(initial, quickNotesLoaded([note('a', 1)]));
        state = reducer(state, quickNoteUpserted(note('a', 1, { archivedAt: '2026-10-17T11:00:00Z' })));
        expect(state.active).toEqual([]);
        expect(state.archived).toBeNull();
    });

    it('puts a restored note back on the board in stacking order', () => {
        let state = reducer(initial, quickNotesLoaded([note('a', 1), note('c', 5)]));
        state = reducer(state, archivedQuickNotesLoaded([note('b', 3, { archivedAt: '2026-10-17T11:00:00Z' })]));
        state = reducer(state, quickNoteUpserted(note('b', 3)));
        expect(state.active.map((n) => n.id)).toEqual(['a', 'b', 'c']);
        expect(state.archived).toEqual([]);
    });

    it('applies a drop before the server answers and re-sorts by the new z', () => {
        let state = reducer(initial, quickNotesLoaded([note('a', 1), note('b', 2)]));
        state = reducer(state, quickNotesMoved([{ id: 'a', x: 40, y: 80, z: 3 }]));
        expect(state.active.map((n) => [n.id, n.x, n.y, n.z])).toEqual([
            ['b', 0, 0, 2],
            ['a', 40, 80, 3],
        ]);
    });

    it('removes a deleted note from both lists', () => {
        let state = reducer(initial, quickNotesLoaded([note('a', 1)]));
        state = reducer(state, archivedQuickNotesLoaded([note('b', 0, { archivedAt: '2026-10-01T00:00:00Z' })]));
        state = reducer(state, quickNoteRemoved('b'));
        state = reducer(state, quickNoteRemoved('a'));
        expect(state.active).toEqual([]);
        expect(state.archived).toEqual([]);
    });
});

describe('dropPosition', () => {
    const board = [note('a', 4), note('b', 9), note('c', 2)];

    it('brings a dropped note in front of every other note', () => {
        expect(dropPosition(board, 'c', { x: 10.4, y: -7.6 })).toEqual({ id: 'c', x: 10, y: -8, z: 10 });
    });

    it('keeps the z of a note that is already in front', () => {
        expect(dropPosition(board, 'b', { x: 5, y: 5 }).z).toBe(9);
    });

    it('keeps a flung note inside the board limits', () => {
        const at = dropPosition(board, 'a', { x: 250000, y: -250000 });
        expect([at.x, at.y]).toEqual([100000, -100000]);
    });

    it('starts an empty board at 1', () => {
        expect(nextZ([])).toBe(1);
    });
});

describe('quickNoteTaskPrefill', () => {
    it('names the task with the first line and describes it with the rest', () => {
        expect(quickNoteTaskPrefill('  Call the bank \n about the card\nbefore Friday ')).toEqual({
            name: 'Call the bank',
            description: 'about the card\nbefore Friday',
        });
    });

    it('cuts a long first line at a word and keeps the tail in the description', () => {
        const words = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ');
        const { name, description } = quickNoteTaskPrefill(words);
        expect(name.length).toBeLessThanOrEqual(255);
        expect(name.endsWith(' ')).toBe(false);
        expect(`${name} ${description}`).toBe(words);
    });

    it('never hands the form a description the task would refuse', () => {
        const { description } = quickNoteTaskPrefill(`title\n${'x'.repeat(400)}`);
        expect(description.length).toBe(255);
    });
});

describe('noteColors', () => {
    const luminance = (hex: string) => {
        const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) =>
            c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
        );
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const contrast = (a: string, b: string) => {
        const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
        return (hi + 0.05) / (lo + 0.05);
    };

    it.each(['light', 'dark'] as const)('keeps every %s note readable', (base) => {
        const paints = noteColors(base);
        expect(Object.keys(paints)).toEqual([...QUICK_NOTE_COLORS]);
        for (const paint of Object.values(paints)) expect(contrast(paint.ink, paint.paper)).toBeGreaterThanOrEqual(4.5);
    });
});
