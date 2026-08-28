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

        expect(migrated.focus).toBeUndefined();
        // And it touches nothing else: a migration that reset the world would lose the user's
        // habits along with the stale field.
        expect(migrated.habits).toEqual(stale.habits);
    });
});
