import { describe, expect, test } from "vitest";
import { PERSIST_VERSION, migrations } from "./persistMigrations";

/**
 * The persisted-state config, not the store.
 *
 * Imports `persistMigrations` and NOT `store`: the latter calls persistStore() at module load,
 * so a test of two pure functions would otherwise boot the whole persistence layer and do
 * localStorage I/O inside the worker for nothing.
 *
 * These exist because of a real crash. The focus slice gained `settings` and `selectedCycle`, and
 * every browser that had opened the Focus Mode before then white-screened on
 * `Cannot read properties of undefined (reading 'shortBreak')`. redux-persist merges at the ROOT
 * level only, so a stored slice REPLACES the reducer initial state for that slice, and a field
 * added later simply is not there.
 */
describe("persisted state migrations", () => {
    test("the version matches the highest migration, so a bump cannot be silent", () => {
        // A version bumped without a migration discards nothing and quietly ships the same bug
        // again. A migration added without a bump never runs.
        const keys = Object.keys(migrations).map(Number);

        expect(Math.max(...keys)).toBe(PERSIST_VERSION);
        expect(keys.every((key) => Number.isInteger(key) && key > 0)).toBe(true);
    });

    test("v1 drops the focus slice, so the reducer supplies the current shape", () => {
        const stale = {
            habits: { habits: [{ id: "h1" }] },
            focus: { mode: "ultrafoco", selectedIndex: 0, manuallySelected: false, timer: null },
        };

        const migrated = migrations[1](stale as never) as Record<string, unknown>;

        // ABSENT, not undefined. `toBeUndefined()` was true for both the broken shape
        // (`{ focus: undefined }`) and the right one, so the test shipped green over a migration
        // that left the key in place and crashed the dashboard on rehydrate.
        expect("focus" in migrated).toBe(false);
        // And it touches nothing else: a migration that reset the world would lose the user's
        // habits along with the stale field.
        expect(migrated.habits).toEqual(stale.habits);
    });

    test("every focus migration removes the key rather than parking undefined under it", () => {
        // redux-persist's reconciler hard-sets every key it finds on the inbound state, so a key
        // holding `undefined` becomes `state.focus === undefined` and the first selector throws.
        const stale = { habits: {}, focus: { mode: "ultrafoco" } };
        for (const key of [1, 2, 3, 4] as const) {
            const migrated = migrations[key](stale as never);
            expect("focus" in migrated).toBe(false);
        }
    });

    test("v5 fills the new goal fields and leaves every other slice, focus included, alone", () => {
        // A running pomodoro has to survive this deploy: v5 is about goals, so the focus slice
        // is not dropped, and the two new fields get the reducers' defaults instead of being
        // read as undefined by the first component.
        const stale = {
            focus: { mode: "fullscreen", timer: { endsAt: 1 } },
            viewFilters: { goals: "name-asc", habits: "default" },
            editGoal: { editMode: false, goalId: "g1" },
        };

        const migrated = migrations[5](stale as never) as Record<string, Record<string, unknown>>;

        expect(migrated.focus).toEqual(stale.focus);
        expect(migrated.viewFilters).toEqual({ goalsViewer: "status", goals: "name-asc", habits: "default" });
        expect(migrated.editGoal).toEqual({ parentId: null, editMode: false, goalId: "g1" });
    });

    test("v5 does not invent slices that were never stored", () => {
        const migrated = migrations[5]({ habits: {} } as never) as Record<string, unknown>;
        expect("viewFilters" in migrated).toBe(false);
        expect("editGoal" in migrated).toBe(false);
    });
});

describe("v6: goal viewer layout and cycle-end alerts", () => {
    test("fills the new viewFilters key and the new focus settings, keeping a running timer", () => {
        const stale = {
            focus: { mode: "fullscreen", timer: { endsAt: 1 }, settings: { pomodoro: 30, shortBreak: 7, longBreak: 20, longBreakEvery: 3 } },
            viewFilters: { goalsViewer: "status", goals: "name-asc" },
        };

        const migrated = migrations[6](stale as never) as Record<string, Record<string, unknown>>;

        expect(migrated.viewFilters).toEqual({ goalsViewerLayout: "grouped", goalsViewer: "status", goals: "name-asc" });
        expect(migrated.focus).toEqual({
            mode: "fullscreen",
            timer: { endsAt: 1 },
            settings: { pomodoro: 30, shortBreak: 7, longBreak: 20, longBreakEvery: 3, soundEnabled: true, notifyEnabled: true },
        });
    });

    test("does not override a value the person already chose, and invents no slices", () => {
        const chosen = { viewFilters: { goalsViewerLayout: "list" }, focus: { settings: { soundEnabled: false } } };
        const migrated = migrations[6](chosen as never) as Record<string, Record<string, Record<string, unknown>>>;
        expect(migrated.viewFilters.goalsViewerLayout).toBe("list");
        expect(migrated.focus.settings.soundEnabled).toBe(false);

        const empty = migrations[6]({ habits: {} } as never) as Record<string, unknown>;
        expect("viewFilters" in empty).toBe(false);
        expect("focus" in empty).toBe(false);
    });
});
