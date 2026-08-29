import { describe, expect, it } from 'vitest';
import reducer, {
    focusEntered,
    focusExited,
    focusItemSelected,
    focusModeChanged,
    focusMovedBy,
    focusStartResolved,
    cycleSelected,
    pomodoroAbandoned,
    pomodoroCycleCompleted,
    pomodoroPaused,
    pomodoroResumed,
    pomodoroSettingsChanged,
    pomodoroStarted,
    restoreFocusState,
} from '../focusSlice';

const TODAY = '2026-08-28';
const enter = () => focusEntered(TODAY);

describe('focusSlice', () => {
    it('starts off, so nothing renders the focus surface before the user asks', () => {
        expect(reducer(undefined, { type: 'init' }).mode).toBe('off');
    });

    it('entering lands on the full routine rather than on a single item', () => {
        expect(reducer(undefined, enter()).mode).toBe('fullscreen');
    });

    it('changes to any later mode without leaving the surface', () => {
        const entered = reducer(undefined, enter());
        expect(reducer(entered, focusModeChanged('ultrafoco')).mode).toBe('ultrafoco');
        expect(reducer(entered, focusModeChanged('descanso')).mode).toBe('descanso');
    });

    it('the clock seeds an untouched selection', () => {
        const entered = reducer(undefined, enter());

        expect(reducer(entered, focusStartResolved(2)).selectedIndex).toBe(2);
    });

    it('the clock NEVER moves a selection the person made by hand', () => {
        // The freedom rule. An item picked at nine in the morning stays picked when its
        // window passes, and a resolver running on a timer is inert on a steered screen.
        const steered = reducer(reducer(undefined, enter()), focusItemSelected(0));

        const after = reducer(steered, focusStartResolved(5));

        expect(after.selectedIndex).toBe(0);
        expect(after.manuallySelected).toBe(true);
    });

    it('stepping is a manual choice too, and clamps instead of wrapping', () => {
        // Running off the end of the day should stop, not start over.
        let state = reducer(reducer(undefined, enter()), focusStartResolved(1));
        expect(state.manuallySelected).toBe(false);

        state = reducer(state, focusMovedBy({ delta: 1, count: 3 }));
        expect(state).toMatchObject({ selectedIndex: 2, manuallySelected: true });

        state = reducer(state, focusMovedBy({ delta: 1, count: 3 }));
        expect(state.selectedIndex).toBe(2);

        state = reducer(state, focusMovedBy({ delta: -5, count: 3 }));
        expect(state.selectedIndex).toBe(0);
    });

    it('stepping from nothing selected starts at the first item', () => {
        const entered = reducer(undefined, enter());
        expect(entered.selectedIndex).toBe(-1);

        expect(reducer(entered, focusMovedBy({ delta: 1, count: 3 })).selectedIndex).toBe(1);
    });

    it('stepping an empty routine changes nothing', () => {
        const entered = reducer(undefined, enter());

        expect(reducer(entered, focusMovedBy({ delta: 1, count: 0 }))).toEqual(entered);
    });

    it('entering again starts a fresh visit, with the clock back in charge', () => {
        const steered = reducer(reducer(undefined, enter()), focusItemSelected(4));

        expect(reducer(steered, enter())).toMatchObject({
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
            reducer(reducer(undefined, enter()), focusModeChanged('ultrafoco')),
            focusItemSelected(3),
        );

        expect(reducer(busy, focusExited())).toEqual(initial);
    });
});

describe('the pomodoro', () => {
    const NOW = 1_800_000_000_000;
    const started = (minutes = 25, groupId = 'g1', now = NOW) =>
        reducer(
            reducer(undefined, enter()),
            pomodoroStarted({ groupId, kind: 'pomodoro', minutes, now, date: TODAY }),
        );

    it('is an absolute end time, never a countdown', () => {
        // The one shape that survives a locked phone, a throttled interval and a reloaded tab.
        const state = started(25);

        expect(state.timer).toMatchObject({
            groupId: 'g1',
            kind: 'pomodoro',
            // Frozen across pause and resume: it is what the server is told on completion.
            startedAt: NOW,
            endsAt: NOW + 25 * 60_000,
            pausedRemainingMs: null,
            durationMinutes: 25,
            completedCycles: 0,
            finished: false,
            date: TODAY,
        });
    });

    it('clamps a typo instead of running for five hours', () => {
        expect(started(300).timer?.durationMinutes).toBe(180);
        expect(started(0).timer?.durationMinutes).toBe(1);
    });

    it('a long pause costs nothing: resuming recomputes the end from what was left', () => {
        const running = started(25);
        const paused = reducer(running, pomodoroPaused({ now: NOW + 60_000 }));
        expect(paused.timer?.pausedRemainingMs).toBe(24 * 60_000);

        // Twenty minutes away from the desk.
        const resumed = reducer(paused, pomodoroResumed({ now: NOW + 21 * 60_000 }));

        expect(resumed.timer?.pausedRemainingMs).toBeNull();
        expect(resumed.timer?.endsAt).toBe(NOW + 21 * 60_000 + 24 * 60_000);
        expect(resumed.timer?.startedAt).toBe(NOW);
    });

    it('a finished cycle cannot be paused or resumed', () => {
        const done = reducer(started(25), pomodoroCycleCompleted());

        expect(reducer(done, pomodoroPaused({ now: NOW }))).toEqual(done);
        expect(reducer(done, pomodoroResumed({ now: NOW }))).toEqual(done);
    });

    it('pausing twice, or resuming what is not paused, changes nothing', () => {
        const paused = reducer(started(25), pomodoroPaused({ now: NOW + 60_000 }));
        expect(reducer(paused, pomodoroPaused({ now: NOW + 120_000 }))).toEqual(paused);

        const running = started(25);
        expect(reducer(running, pomodoroResumed({ now: NOW + 60_000 }))).toEqual(running);
    });

    it('a finished pomodoro counts, and hands over to a break the person has to start', () => {
        const done = reducer(started(25), pomodoroCycleCompleted());

        expect(done.timer).toMatchObject({ kind: 'shortBreak', completedCycles: 1, finished: true });
        // Marked finished rather than parked as paused: a 0 in `pausedRemainingMs` made
        // `timerStatus` report PAUSED, and the "cycle finished" panel never showed at all.
        expect(done.timer?.pausedRemainingMs).toBeNull();
    });

    it('completing twice in a row does nothing the second time', () => {
        // The effect that notices the crossing derives its trigger from the clock, so without
        // this guard it re-fired on every render and flipped `kind` back and forth forever.
        const once = reducer(started(25), pomodoroCycleCompleted());

        expect(reducer(once, pomodoroCycleCompleted())).toEqual(once);
    });

    it('a finished BREAK does not count as a pomodoro', () => {
        const afterWork = reducer(started(25), pomodoroCycleCompleted());
        // Starting the break, then letting it run out.
        const breakRunning = reducer(
            afterWork,
            pomodoroStarted({ groupId: 'g1', kind: 'shortBreak', minutes: 5, now: NOW, date: TODAY }),
        );
        const afterBreak = reducer(breakRunning, pomodoroCycleCompleted());

        expect(afterBreak.timer).toMatchObject({ kind: 'pomodoro', completedCycles: 1 });
    });

    it('keeps the count while the item stays the same, and restarts it on another item', () => {
        // The count is about the item, not about the sitting.
        const oneDone = reducer(started(25), pomodoroCycleCompleted());

        const sameItem = reducer(
            oneDone,
            pomodoroStarted({ groupId: 'g1', kind: 'pomodoro', minutes: 25, now: NOW, date: TODAY }),
        );
        expect(sameItem.timer?.completedCycles).toBe(1);

        const otherItem = reducer(
            oneDone,
            pomodoroStarted({ groupId: 'g2', kind: 'pomodoro', minutes: 25, now: NOW, date: TODAY }),
        );
        expect(otherItem.timer?.completedCycles).toBe(0);
    });

    it('abandoning keeps nothing and counts nothing', () => {
        // There is no failure state in this feature, so there is nothing to record.
        const oneDone = reducer(started(25), pomodoroCycleCompleted());

        expect(reducer(oneDone, pomodoroAbandoned()).timer).toBeNull();
    });

    it('survives leaving the screen, because a timer is a promise about the next 25 minutes', () => {
        const running = started(25);

        const left = reducer(running, focusExited());

        expect(left.timer).toEqual(running.timer);
        // And nothing else does: the selection and the mode are per visit.
        expect(left).toMatchObject({ mode: 'off', selectedIndex: -1, manuallySelected: false });
    });

    it('survives re-entering on the same day', () => {
        const running = started(25);

        expect(reducer(running, focusEntered(TODAY)).timer).toEqual(running.timer);
    });

    it("does NOT survive into another day", () => {
        // Otherwise somebody opening the app on Tuesday is greeted by Monday's finished cycle.
        const running = started(25);

        expect(reducer(running, focusEntered('2026-08-29')).timer).toBeNull();
    });
});

describe('the three cycles and their settings', () => {
    const NOW = 1_800_000_000_000;

    it('starts on the pomodoro tab with the classic numbers', () => {
        const entered = reducer(undefined, enter());

        expect(entered.selectedCycle).toBe('pomodoro');
        expect(entered.settings).toEqual({
            pomodoro: 25,
            shortBreak: 5,
            longBreak: 15,
            longBreakEvery: 4,
        });
    });

    it('a tab is just a tab: selecting one does not touch a running timer', () => {
        const running = reducer(
            reducer(undefined, enter()),
            pomodoroStarted({ groupId: 'g1', kind: 'pomodoro', minutes: 25, now: NOW, date: TODAY }),
        );

        const looking = reducer(running, cycleSelected('longBreak'));

        expect(looking.selectedCycle).toBe('longBreak');
        expect(looking.timer).toEqual(running.timer);
    });

    it('starting a cycle moves the tab to it, so the two never disagree', () => {
        const state = reducer(reducer(undefined, enter()), cycleSelected('longBreak'));

        const started = reducer(
            state,
            pomodoroStarted({ groupId: 'g1', kind: 'shortBreak', minutes: 5, now: NOW, date: TODAY }),
        );

        expect(started.selectedCycle).toBe('shortBreak');
    });

    it('each setting can be changed on its own, and every one is clamped', () => {
        let state = reducer(undefined, enter());

        state = reducer(state, pomodoroSettingsChanged({ pomodoro: 50 }));
        expect(state.settings).toMatchObject({ pomodoro: 50, shortBreak: 5, longBreak: 15 });

        state = reducer(state, pomodoroSettingsChanged({ shortBreak: 999, longBreakEvery: 0 }));
        expect(state.settings).toMatchObject({ pomodoro: 50, shortBreak: 180, longBreakEvery: 1 });
    });

    it('the fourth pomodoro pays the LONG break', () => {
        // Which break is earned depends on the count after this one, so the reducer decides it
        // rather than the component.
        let state = reducer(undefined, enter());
        for (let n = 1; n <= 4; n += 1) {
            state = reducer(
                state,
                pomodoroStarted({ groupId: 'g1', kind: 'pomodoro', minutes: 1, now: NOW, date: TODAY }),
            );
            state = reducer(state, pomodoroCycleCompleted());
            if (n < 4) {
                expect(state.timer?.kind).toBe('shortBreak');
            }
        }

        expect(state.timer).toMatchObject({ kind: 'longBreak', completedCycles: 4 });
        expect(state.selectedCycle).toBe('longBreak');
    });

    it('a configured interval of two makes every second one long', () => {
        let state = reducer(
            reducer(undefined, enter()),
            pomodoroSettingsChanged({ longBreakEvery: 2 }),
        );

        state = reducer(
            state,
            pomodoroStarted({ groupId: 'g1', kind: 'pomodoro', minutes: 1, now: NOW, date: TODAY }),
        );
        state = reducer(state, pomodoroCycleCompleted());
        expect(state.timer?.kind).toBe('shortBreak');

        state = reducer(
            state,
            pomodoroStarted({ groupId: 'g1', kind: 'pomodoro', minutes: 1, now: NOW, date: TODAY }),
        );
        state = reducer(state, pomodoroCycleCompleted());
        expect(state.timer?.kind).toBe('longBreak');
    });

    it('settings survive exiting, and survive a change of day', () => {
        // Unlike the timer: these are preferences, not the state of one sitting.
        const configured = reducer(
            reducer(undefined, enter()),
            pomodoroSettingsChanged({ pomodoro: 40, longBreak: 20 }),
        );

        expect(reducer(configured, focusExited()).settings).toEqual(configured.settings);
        expect(reducer(configured, focusEntered('2026-09-01')).settings).toEqual(configured.settings);
    });

    it('re-entering mid-cycle shows the tab of what is actually running', () => {
        // Otherwise the Pomodoro tab sat over a counting-down break.
        const onBreak = reducer(
            reducer(undefined, enter()),
            pomodoroStarted({ groupId: 'g1', kind: 'longBreak', minutes: 15, now: NOW, date: TODAY }),
        );

        expect(reducer(onBreak, focusEntered(TODAY)).selectedCycle).toBe('longBreak');
    });
});

describe('what survives storage', () => {
    // The web store persists this slice and redux-persist HARD SETS a stored slice over the
    // reducer's initial state. Everything below is about one reported bug: the "enter focus"
    // button vanished from the dashboard and stayed gone across restarts of the dev stack,
    // because a tab closed inside the focus screen never ran `focusExited` and left
    // `mode: "ultrafoco"` in localStorage.
    const stale = {
        mode: 'ultrafoco',
        selectedIndex: 7,
        manuallySelected: true,
        timer: {
            kind: 'pomodoro',
            date: '2026-08-29',
            startedAt: 1,
            endsAt: 2,
            minutes: 25,
            pausedRemainingMs: null,
            finished: false,
        },
        selectedCycle: 'longBreak',
        settings: { pomodoro: 30, shortBreak: 7, longBreak: 20, longBreakEvery: 3 },
        microTasks: { 'item-1': [{ id: 'a', name: 'Stretch' }] },
    };

    it('drops the visit: the mode, the selection and the cached micro-tasks', () => {
        const restored = restoreFocusState(stale);

        expect(restored.mode).toBe('off');
        expect(restored.selectedIndex).toBe(-1);
        expect(restored.manuallySelected).toBe(false);
        expect(restored.microTasks).toEqual({});
    });

    it('keeps the timer and the settings, which is why a blacklist would not do', () => {
        const restored = restoreFocusState(stale);

        expect(restored.timer).toEqual(stale.timer);
        expect(restored.settings).toEqual(stale.settings);
    });

    it('returns a COMPLETE state, whatever the stored shape was', () => {
        // A partial object would leave the rest undefined, which is the white screen the persist
        // migrations exist to prevent. Both of these are shapes an older build could have written.
        for (const stored of [{}, { mode: 'descanso' }, null, undefined, 'nonsense']) {
            const restored = restoreFocusState(stored);
            expect(Object.keys(restored).sort()).toEqual(Object.keys(restoreFocusState(stale)).sort());
            expect(restored.settings.shortBreak).toBeGreaterThan(0);
            expect(restored.selectedCycle).toBe('pomodoro');
        }
    });

    it('fills in a setting a shorter stored shape never had', () => {
        const restored = restoreFocusState({ settings: { pomodoro: 50 } });

        expect(restored.settings.pomodoro).toBe(50);
        expect(restored.settings.longBreakEvery).toBeGreaterThan(0);
    });
});
