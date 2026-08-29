/**
 * The Focus Mode's history, as the server keeps it.
 *
 * Wire names match the backend's `FocusCycleResponseDTO` / `FocusMicroTaskResponseDTO`. The
 * cycle kinds are the SERVER's spelling (SCREAMING_SNAKE); `@beyou/state` maps them to and from the
 * client's camelCase `CycleKind`.
 */
export type ServerCycleKind = 'POMODORO' | 'SHORT_BREAK' | 'LONG_BREAK';

export type FocusCycle = {
    id: string;
    /** The user's local day, as resolved by the server. */
    date: string;
    /** Null for a cycle run with nothing selected. */
    itemGroupId: string | null;
    kind: ServerCycleKind;
    startedAt: string;
    endedAt: string;
    minutes: number;
};

/**
 * One micro-task on one routine item, on one day.
 *
 * `pinned` is a template flag: the server creates a row for the name on every item the person
 * moves to. `doneAt` is a timestamp rather than a boolean, null while open.
 */
export type FocusMicroTask = {
    id: string;
    date: string;
    itemGroupId: string;
    name: string;
    pinned: boolean;
    doneAt: string | null;
};

export type FocusDay = {
    date: string;
    cycles: FocusCycle[];
    microTasks: FocusMicroTask[];
};
