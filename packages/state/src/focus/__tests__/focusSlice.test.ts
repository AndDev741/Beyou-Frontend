import { describe, expect, it } from 'vitest';
import reducer, {
    focusEntered,
    focusExited,
    focusItemSelected,
    focusModeChanged,
    focusMovedBy,
    focusStartResolved,
} from '../focusSlice';

describe('focusSlice', () => {
    it('starts off, so nothing renders the focus surface before the user asks', () => {
        expect(reducer(undefined, { type: 'init' }).mode).toBe('off');
    });

    it('entering lands on the full routine rather than on a single item', () => {
        expect(reducer(undefined, focusEntered()).mode).toBe('fullscreen');
    });

    it('changes to any later mode without leaving the surface', () => {
        const entered = reducer(undefined, focusEntered());
        expect(reducer(entered, focusModeChanged('ultrafoco')).mode).toBe('ultrafoco');
        expect(reducer(entered, focusModeChanged('descanso')).mode).toBe('descanso');
    });

    it('the clock seeds an untouched selection', () => {
        const entered = reducer(undefined, focusEntered());

        expect(reducer(entered, focusStartResolved(2)).selectedIndex).toBe(2);
    });

    it('the clock NEVER moves a selection the person made by hand', () => {
        // The freedom rule. An item picked at nine in the morning stays picked when its
        // window passes, and a resolver running on a timer is inert on a steered screen.
        const steered = reducer(reducer(undefined, focusEntered()), focusItemSelected(0));

        const after = reducer(steered, focusStartResolved(5));

        expect(after.selectedIndex).toBe(0);
        expect(after.manuallySelected).toBe(true);
    });

    it('stepping is a manual choice too, and clamps instead of wrapping', () => {
        // Running off the end of the day should stop, not start over.
        let state = reducer(reducer(undefined, focusEntered()), focusStartResolved(1));
        expect(state.manuallySelected).toBe(false);

        state = reducer(state, focusMovedBy({ delta: 1, count: 3 }));
        expect(state).toMatchObject({ selectedIndex: 2, manuallySelected: true });

        state = reducer(state, focusMovedBy({ delta: 1, count: 3 }));
        expect(state.selectedIndex).toBe(2);

        state = reducer(state, focusMovedBy({ delta: -5, count: 3 }));
        expect(state.selectedIndex).toBe(0);
    });

    it('stepping from nothing selected starts at the first item', () => {
        const entered = reducer(undefined, focusEntered());
        expect(entered.selectedIndex).toBe(-1);

        expect(reducer(entered, focusMovedBy({ delta: 1, count: 3 })).selectedIndex).toBe(1);
    });

    it('stepping an empty routine changes nothing', () => {
        const entered = reducer(undefined, focusEntered());

        expect(reducer(entered, focusMovedBy({ delta: 1, count: 0 }))).toEqual(entered);
    });

    it('entering again starts a fresh visit, with the clock back in charge', () => {
        const steered = reducer(reducer(undefined, focusEntered()), focusItemSelected(4));

        expect(reducer(steered, focusEntered())).toMatchObject({
            mode: 'fullscreen',
            selectedIndex: -1,
            manuallySelected: false,
        });
    });

    it('exiting resets the whole slice, not just the mode', () => {
        // The guard for the later phases: F3 adds timer fields and F4 adds session
        // micro-tasks, and both are scoped to one visit. Comparing against the reducer's
        // own initial state means a new field cannot quietly survive an exit.
        const initial = reducer(undefined, { type: 'init' });
        const busy = reducer(
            reducer(reducer(undefined, focusEntered()), focusModeChanged('ultrafoco')),
            focusItemSelected(3),
        );

        expect(reducer(busy, focusExited())).toEqual(initial);
    });
});
