import { schedule } from "../schedule/schedule";
import { RoutineSection, check } from "./routineSection";

/**
 * Which shape a routine takes.
 *
 * "DAILY" is the original: sections with time windows, each habit or task inside one
 * carrying its own. "LIST" is a flat, ordered checklist with neither — the user ticks items
 * off whenever they like during the day.
 *
 * Everything else is the same for both. A list is scheduled to weekdays, reaches the
 * dashboard on its days, is snapshotted, and pays the same XP.
 */
export type RoutineType = "DAILY" | "LIST";

/** One entry in a LIST routine. */
export type RoutineListItem = {
    /**
     * The item group's id, and what the check and skip endpoints take — a list item is
     * checked by exactly the call a sectioned one is.
     */
    id: string;
    type: "HABIT" | "TASK";
    /** Set when type is "HABIT"; the other is null. */
    habitId?: string | null;
    /** Set when type is "TASK". */
    taskId?: string | null;
    orderIndex: number;
    checks?: check[];
};

export type Routine = {
    id?: string;
    name: string;
    /**
     * Absent on anything the backend wrote before the List type existed, and treated as
     * "DAILY" everywhere it is read. Read it through `isListRoutine` from @beyou/state
     * rather than comparing here, so the "absent means daily" rule lives in one place.
     *
     * The helper is NOT in this package on purpose: @beyou/types is types-only, every
     * declaration in it is erased at compile time, and adding the first runtime value would
     * turn it into a real module for every consumer.
     */
    type?: RoutineType;
    iconId: string;
    /**
     * Always populated, for both shapes. A LIST routine keeps its items in one internal
     * section so that snapshots, check-ins and the pre-List renderers keep working; read
     * `items` instead when you know you are looking at a list.
     */
    routineSections: Array<RoutineSection>;
    /** A LIST routine's entries, in the order the user arranged. Empty for a DAILY one. */
    items?: Array<RoutineListItem>;
    schedule?: schedule;
    xp?: number,
    level?: number,
    nextLevelXp?: number,
    actualLevelXp?: number,
}
