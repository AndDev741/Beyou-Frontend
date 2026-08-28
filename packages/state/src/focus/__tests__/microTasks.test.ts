import { describe, expect, it } from 'vitest';
import reducer, {
    focusEntered,
    focusExited,
    microTaskAdded,
    microTaskPinToggled,
    microTaskRemoved,
    microTaskToggled,
    microTasksHydrated,
} from '../focusSlice';
import {
    MAX_MICRO_TASKS,
    MICRO_TASK_MAX_LENGTH,
    isMicroTaskDone,
    normalizeMicroTaskName,
    persistableMicroTasks,
    suggestMicroTask,
    type MicroTask,
} from '../microTasks';

const TODAY = '2026-08-28';
const YESTERDAY = '2026-08-27';
const enter = (date = TODAY) => focusEntered(date);

const task = (over: Partial<MicroTask> = {}): MicroTask => ({
    id: '1',
    name: 'Stretch',
    pinned: false,
    doneOn: null,
    ...over,
});

describe('normalizeMicroTaskName', () => {
    it('trims, and bounds one line so it cannot fill the storage value alone', () => {
        expect(normalizeMicroTaskName('  Stretch  ')).toBe('Stretch');
        expect(normalizeMicroTaskName('x'.repeat(200))).toHaveLength(MICRO_TASK_MAX_LENGTH);
        expect(normalizeMicroTaskName('   ')).toBe('');
    });
});

describe('isMicroTaskDone', () => {
    it('is a date comparison, so a pinned task comes back fresh tomorrow', () => {
        // A boolean would need something to reset it, and nothing would.
        expect(isMicroTaskDone(task({ doneOn: TODAY }), TODAY)).toBe(true);
        expect(isMicroTaskDone(task({ doneOn: YESTERDAY }), TODAY)).toBe(false);
        expect(isMicroTaskDone(task(), TODAY)).toBe(false);
    });
});

describe('persistableMicroTasks', () => {
    it('writes only the standing ones', () => {
        const list = [task({ id: '1', pinned: true }), task({ id: '2', pinned: false })];

        expect(persistableMicroTasks(list, TODAY).map((entry) => entry.id)).toEqual(['1']);
    });

    it("drops a tick from another day rather than storing it", () => {
        const stale = [task({ id: '1', pinned: true, doneOn: YESTERDAY })];

        expect(persistableMicroTasks(stale, TODAY)[0].doneOn).toBeNull();
    });

    it("keeps today's tick, so a reload does not lose what was just done", () => {
        const fresh = [task({ id: '1', pinned: true, doneOn: TODAY })];

        expect(persistableMicroTasks(fresh, TODAY)[0].doneOn).toBe(TODAY);
    });
});

describe('suggestMicroTask', () => {
    it('offers a standing one first, then anything still open', () => {
        const list = [task({ id: '1' }), task({ id: '2', pinned: true })];

        expect(suggestMicroTask(list, TODAY)?.id).toBe('2');
        expect(suggestMicroTask([task({ id: '9' })], TODAY)?.id).toBe('9');
    });

    it('offers nothing once everything is done', () => {
        const done = [task({ id: '1', doneOn: TODAY }), task({ id: '2', pinned: true, doneOn: TODAY })];

        expect(suggestMicroTask(done, TODAY)).toBeNull();
        expect(suggestMicroTask([], TODAY)).toBeNull();
    });
});

describe('the micro-task reducers', () => {
    it('adds as a ONE-OFF, because pinning is a separate deliberate act', () => {
        // A list that silently accumulates forever is the worse of the two failures.
        const state = reducer(reducer(undefined, enter()), microTaskAdded('Stretch'));

        expect(state.microTasks).toEqual([
            { id: '1', name: 'Stretch', pinned: false, doneOn: null },
        ]);
    });

    it('ignores an empty name and trims what it keeps', () => {
        let state = reducer(undefined, enter());
        state = reducer(state, microTaskAdded('   '));
        expect(state.microTasks).toEqual([]);

        state = reducer(state, microTaskAdded('  Water  '));
        expect(state.microTasks[0].name).toBe('Water');
    });

    it('stops at the cap rather than growing past what storage holds', () => {
        // The native side keeps the whole list in ONE SecureStore value, which caps around 2048
        // bytes; the routine-collapsed map broke silently on exactly that limit.
        let state = reducer(undefined, enter());
        for (let n = 0; n < MAX_MICRO_TASKS + 5; n += 1) {
            state = reducer(state, microTaskAdded(`Task ${n}`));
        }

        expect(state.microTasks).toHaveLength(MAX_MICRO_TASKS);
    });

    it('gives every task its own id, even after one is removed', () => {
        let state = reducer(undefined, enter());
        state = reducer(state, microTaskAdded('One'));
        state = reducer(state, microTaskAdded('Two'));
        state = reducer(state, microTaskRemoved('1'));
        state = reducer(state, microTaskAdded('Three'));

        const ids = state.microTasks.map((entry) => entry.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('ticks and un-ticks against the date it was given', () => {
        let state = reducer(reducer(undefined, enter()), microTaskAdded('Stretch'));

        state = reducer(state, microTaskToggled({ id: '1', date: TODAY }));
        expect(state.microTasks[0].doneOn).toBe(TODAY);

        state = reducer(state, microTaskToggled({ id: '1', date: TODAY }));
        expect(state.microTasks[0].doneOn).toBeNull();
    });

    it("re-ticking on a new day moves the date rather than clearing it", () => {
        const yesterdayDone = reducer(
            reducer(reducer(undefined, enter()), microTaskAdded('Stretch')),
            microTaskToggled({ id: '1', date: YESTERDAY }),
        );

        const today = reducer(yesterdayDone, microTaskToggled({ id: '1', date: TODAY }));

        expect(today.microTasks[0].doneOn).toBe(TODAY);
    });

    it('pins and unpins', () => {
        let state = reducer(reducer(undefined, enter()), microTaskAdded('Stretch'));

        state = reducer(state, microTaskPinToggled('1'));
        expect(state.microTasks[0].pinned).toBe(true);

        state = reducer(state, microTaskPinToggled('1'));
        expect(state.microTasks[0].pinned).toBe(false);
    });
});

describe('what survives leaving the screen', () => {
    const withBoth = () => {
        let state = reducer(undefined, enter());
        state = reducer(state, microTaskAdded('One-off'));
        state = reducer(state, microTaskAdded('Standing'));
        return reducer(state, microTaskPinToggled('2'));
    };

    it('keeps the standing ones and drops the one-offs', () => {
        const left = reducer(withBoth(), focusExited());

        expect(left.microTasks.map((entry) => entry.name)).toEqual(['Standing']);
    });

    it('same on re-entering, on any day', () => {
        const back = reducer(withBoth(), focusEntered('2026-09-05'));

        expect(back.microTasks.map((entry) => entry.name)).toEqual(['Standing']);
    });
});

describe('hydrating from device storage', () => {
    it('merges rather than replacing, so a task typed first is not swallowed', () => {
        const typed = reducer(reducer(undefined, enter()), microTaskAdded('Typed'));

        const merged = reducer(
            typed,
            microTasksHydrated([task({ id: '77', name: 'Stored', pinned: true })]),
        );

        expect(merged.microTasks.map((entry) => entry.name)).toEqual(['Stored', 'Typed']);
    });

    it('moves the id counter past anything stored, so a new task cannot collide', () => {
        const hydrated = reducer(
            reducer(undefined, enter()),
            microTasksHydrated([task({ id: '77', pinned: true })]),
        );

        const added = reducer(hydrated, microTaskAdded('After'));

        expect(added.microTasks.map((entry) => entry.id)).toEqual(['77', '78']);
    });

    it('caps what it takes from storage', () => {
        const many = Array.from({ length: MAX_MICRO_TASKS + 5 }, (_, n) =>
            task({ id: String(n + 1), pinned: true }),
        );

        expect(reducer(reducer(undefined, enter()), microTasksHydrated(many)).microTasks).toHaveLength(
            MAX_MICRO_TASKS,
        );
    });
});
