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
    snapshotDate: string;
    routineName: string;
    routineIconId: string;
    completed: boolean;
    structure: SnapshotStructure;
    checks: SnapshotCheck[];
};

export type SnapshotMonthResponse = {
    dates: string[];
};
