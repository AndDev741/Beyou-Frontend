import type { FocusCycle, FocusMicroTask } from '../focus/focus';

export type SnapshotCheck = {
    id: string;
    itemType: 'HABIT' | 'TASK';
    itemName: string;
    itemIconId: string;
    sectionName: string;
    originalGroupId: string;
    difficulty: number;
    importance: number;
    checked: boolean;
    skipped: boolean;
    checkTime: string | null;
    xpGenerated: number;
    /**
     * What the Focus Mode did on this item that day. Joined server-side on `originalGroupId`.
     * Absent from snapshots written before the Focus Mode existed, so read with a default.
     */
    microTasks?: FocusMicroTask[];
    /** Completed POMODORO cycles on this item. Breaks do not count. */
    pomodoros?: number;
};

export type SnapshotStructureItem = {
    type: 'HABIT' | 'TASK';
    groupId: string;
    itemId: string;
    name: string;
    iconId: string;
    startTime: string | null;
    endTime: string | null;
};

export type SnapshotStructureSection = {
    name: string;
    iconId: string;
    orderIndex: number;
    startTime: string | null;
    endTime: string | null;
    items: SnapshotStructureItem[];
};

export type SnapshotStructure = {
    sections: SnapshotStructureSection[];
};

export type Snapshot = {
    id: string;
    routineId: string;
    snapshotDate: string;
    routineName: string;
    routineIconId: string;
    completed: boolean;
    structure: SnapshotStructure;
    checks: SnapshotCheck[];
    /**
     * Every cycle of the day that ran on one of this routine's items, plus every cycle that ran on
     * no item at all. Absent from older snapshots.
     */
    focusCycles?: FocusCycle[];
};

export type SnapshotMonthResponse = {
    dates: string[];
};
