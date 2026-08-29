import { describe, expect, it } from 'vitest';
import reducer, {
    focusEntered,
    focusExited,
    microTaskRemoved,
    microTaskUpserted,
    microTasksLoaded,
} from '../focusSlice';
import {
    MICRO_TASK_MAX_LENGTH,
    isMicroTaskDone,
    normalizeMicroTaskName,
    suggestMicroTask,
    type FocusMicroTask,
} from '../microTasks';

const TODAY = '2026-08-28';
const enter = () => focusEntered(TODAY);

const task = (over: Partial<FocusMicroTask> = {}): FocusMicroTask => ({
    id: '1',
    date: TODAY,
    itemGroupId: 'item-a',
    name: 'Stretch',
    pinned: false,
    doneAt: null,
    ...over,
});

describe('normalizeMicroTaskName', () => {
    it('trims, and bounds one line to what the column takes', () => {
        expect(normalizeMicroTaskName('  Stretch  ')).toBe('Stretch');
        expect(normalizeMicroTaskName('x'.repeat(200))).toHaveLength(MICRO_TASK_MAX_LENGTH);
        expect(normalizeMicroTaskName('   ')).toBe('');
    });
});

describe('isMicroTaskDone', () => {
    it('reads the server timestamp: set is done, null is open', () => {
        expect(isMicroTaskDone(task({ doneAt: '2026-08-28T10:00:00Z' }))).toBe(true);
        expect(isMicroTaskDone(task())).toBe(false);
    });
});

describe('suggestMicroTask', () => {
    it('offers a standing one first, then anything still open, then nothing', () => {
        const list = [task({ id: '1' }), task({ id: '2', pinned: true })];
        expect(suggestMicroTask(list)?.id).toBe('2');
        expect(suggestMicroTask([task({ id: '9' })])?.id).toBe('9');
        expect(suggestMicroTask([task({ doneAt: '2026-08-28T10:00:00Z' })])).toBeNull();
        expect(suggestMicroTask([])).toBeNull();
    });
});

describe('the micro-task cache', () => {
    it('is keyed by item, so switching items switches lists', () => {
        // The user's rule: a micro-task belongs to an item, and moving to another item does not
        // carry the list over. The slice cannot get this wrong because it never merges items.
        let state = reducer(undefined, enter());
        state = reducer(state, microTasksLoaded({ itemGroupId: 'item-a', tasks: [task({ id: '1' })] }));
        state = reducer(state, microTasksLoaded({ itemGroupId: 'item-b', tasks: [] }));

        expect(state.microTasks['item-a']).toHaveLength(1);
        expect(state.microTasks['item-b']).toEqual([]);
    });

    it("a load replaces that item's cache wholesale, and leaves other items alone", () => {
        let state = reducer(undefined, enter());
        state = reducer(state, microTasksLoaded({ itemGroupId: 'item-a', tasks: [task({ id: '1' }), task({ id: '2' })] }));
        state = reducer(state, microTasksLoaded({ itemGroupId: 'item-b', tasks: [task({ id: '3', itemGroupId: 'item-b' })] }));

        state = reducer(state, microTasksLoaded({ itemGroupId: 'item-a', tasks: [task({ id: '2' })] }));

        expect(state.microTasks['item-a'].map((t) => t.id)).toEqual(['2']);
        expect(state.microTasks['item-b'].map((t) => t.id)).toEqual(['3']);
    });

    it('upserts by id: a new row appends, a known row is replaced in place', () => {
        let state = reducer(undefined, enter());
        state = reducer(state, microTaskUpserted(task({ id: '1', name: 'Water' })));
        state = reducer(state, microTaskUpserted(task({ id: '2', name: 'Stretch' })));
        state = reducer(state, microTaskUpserted(task({ id: '1', name: 'Water', doneAt: '2026-08-28T10:00:00Z' })));

        expect(state.microTasks['item-a'].map((t) => [t.id, t.doneAt !== null])).toEqual([
            ['1', true],
            ['2', false],
        ]);
    });

    it('an upsert lands under the row\'s OWN item, whatever is selected', () => {
        // A pinned name the server materialised on item B arrives tagged item-b, and must not be
        // filed under whichever item happens to be on screen.
        const state = reducer(reducer(undefined, enter()), microTaskUpserted(task({ id: '7', itemGroupId: 'item-b' })));

        expect(state.microTasks['item-b']).toHaveLength(1);
        expect(state.microTasks['item-a']).toBeUndefined();
    });

    it('removes by id within the item', () => {
        let state = reducer(undefined, enter());
        state = reducer(state, microTasksLoaded({ itemGroupId: 'item-a', tasks: [task({ id: '1' }), task({ id: '2' })] }));

        state = reducer(state, microTaskRemoved({ itemGroupId: 'item-a', id: '1' }));

        expect(state.microTasks['item-a'].map((t) => t.id)).toEqual(['2']);
    });

    it('tolerates a rehydrated slice from before the cache existed', () => {
        // The persisted-shape rule again: the reducer must not throw on `undefined.microTasks`.
        const stale = { ...reducer(undefined, enter()), microTasks: undefined } as never;

        expect(() => reducer(stale, microTaskUpserted(task()))).not.toThrow();
        expect(() => reducer(stale, microTaskRemoved({ itemGroupId: 'x', id: 'y' }))).not.toThrow();
    });

    it('is dropped on entering and on exiting: the server is the source of truth', () => {
        // Cheap to refetch, and holding it across visits risked showing yesterday's list for a
        // second before the read came back.
        let state = reducer(undefined, enter());
        state = reducer(state, microTasksLoaded({ itemGroupId: 'item-a', tasks: [task()] }));

        expect(reducer(state, focusExited()).microTasks).toEqual({});
        expect(reducer(state, focusEntered('2026-08-29')).microTasks).toEqual({});
    });
});
