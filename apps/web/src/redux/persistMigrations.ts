/**
 * Persisted-state version and migrations.
 *
 * Their own module, with no imports and no side effects, so they can be tested without booting
 * the store: `store.ts` calls `persistStore()` at module load, and a test that merely wanted to
 * check a pure migration function ended up doing localStorage I/O inside the vitest worker.
 *
 * Why any of this exists. redux-persist's default reconciler (`autoMergeLevel1`) merges at the
 * ROOT level only: a stored slice REPLACES the reducer's initial state for that slice, key for
 * key. So adding a field to a persisted slice breaks every browser that already stored the older
 * shape — the field is simply absent, and the first component to read it crashes before any
 * reducer can fix it.
 *
 * That is not hypothetical. The focus slice gained `settings` and `selectedCycle`, and every
 * browser that had opened the Focus Mode before then white-screened on
 * `Cannot read properties of undefined (reading 'shortBreak')`. Restarting the dev stack does not
 * help, because the stale shape lives in the browser's localStorage, not on the server.
 *
 * **Bump `PERSIST_VERSION` and add a migration whenever a persisted slice gains or renames a
 * field.** Dropping the slice is usually the right migration: the reducer then supplies its own
 * initial state, which is by definition the current shape.
 */
export const PERSIST_VERSION = 4;

export const migrations = {
    // v1: the focus slice gained `settings` and `selectedCycle` (the three-cycle pomodoro).
    // Dropped rather than patched: nothing in it is worth preserving across the change — the
    // selection and the mode are per visit, and a timer from before the rework carries a cycle
    // kind the new code does not know.
    1: (state: Record<string, unknown>) => ({ ...state, focus: undefined }),
    // v2: the focus slice gained `microTasks` and `microTaskSeq` (the break's micro-tasks).
    // Dropped again for the same reason, and this repeat is the point of the rule above: every
    // field added to a persisted slice needs a bump, or the browsers holding the previous shape
    // read the new field as undefined on their first render.
    2: (state: Record<string, unknown>) => ({ ...state, focus: undefined }),
    // v3: `microTasks` changed shape (array → per-item map, server-owned), `microTaskSeq` went
    // away, and `FocusTimer` gained `startedAt`. Dropped for the same reason as before.
    3: (state: Record<string, unknown>) => ({ ...state, focus: undefined }),
    // v4: `FocusTimer` gained `rounds`, the counter the `#N` line reads. The reducer reads it
    // tolerantly too, so this bump is belt and braces rather than the only defence — but the rule
    // above says every added field gets one, and the two times it was skipped both cost a bug.
    4: (state: Record<string, unknown>) => ({ ...state, focus: undefined }),
};
