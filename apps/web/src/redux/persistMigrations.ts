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
export const PERSIST_VERSION = 5;

/**
 * Drop the focus slice by REMOVING the key, never by assigning `undefined`.
 *
 * The difference is the whole bug this replaced. redux-persist's reconciler iterates
 * `Object.keys(inboundState)` and hard-sets each one onto the reducer's state — a key that is
 * present with the value `undefined` is still a key, so `{ ...state, focus: undefined }` produced
 * `state.focus === undefined` after rehydrate, and the first component to read `state.focus.timer`
 * threw. Every browser that had never stored a version (`_persist.version === -1`) ran every
 * migration on its first load after the deploy, so this would have hit each returning user once.
 *
 * With the key gone the reconciler never touches the slice and the reducer's own initial state,
 * which is by definition the current shape, is what the app boots with.
 */
const dropFocus = ({ focus: _dropped, ...rest }: Record<string, unknown>) => rest;

export const migrations = {
    // v1: the focus slice gained `settings` and `selectedCycle` (the three-cycle pomodoro).
    // Dropped rather than patched: nothing in it is worth preserving across the change — the
    // selection and the mode are per visit, and a timer from before the rework carries a cycle
    // kind the new code does not know.
    1: dropFocus,
    // v2: the focus slice gained `microTasks` and `microTaskSeq` (the break's micro-tasks).
    // Dropped again for the same reason, and this repeat is the point of the rule above: every
    // field added to a persisted slice needs a bump, or the browsers holding the previous shape
    // read the new field as undefined on their first render.
    2: dropFocus,
    // v3: `microTasks` changed shape (array → per-item map, server-owned), `microTaskSeq` went
    // away, and `FocusTimer` gained `startedAt`. Dropped for the same reason as before.
    3: dropFocus,
    // v4: `FocusTimer` gained `rounds`, the counter the `#N` line reads. The reducer reads it
    // tolerantly too, so this bump is belt and braces rather than the only defence — but the rule
    // above says every added field gets one, and the two times it was skipped both cost a bug.
    4: dropFocus,
    // v5: nested goals and the goal viewer. `viewFilters` gained `goalsViewer` and `editGoal`
    // gained `parentId`. Neither slice is worth dropping (the sort preferences are the whole
    // point of persisting viewFilters), so the two fields are filled with the reducers'
    // defaults instead of the slices being reset.
    5: (state: Record<string, unknown>) => {
        const viewFilters = (state.viewFilters ?? {}) as Record<string, unknown>;
        const editGoal = (state.editGoal ?? {}) as Record<string, unknown>;
        return {
            ...state,
            ...(state.viewFilters ? { viewFilters: { goalsViewer: 'status', ...viewFilters } } : {}),
            ...(state.editGoal ? { editGoal: { parentId: null, ...editGoal } } : {}),
        };
    },
};
