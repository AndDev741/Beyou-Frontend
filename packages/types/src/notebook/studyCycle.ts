/**
 * The study cycle (ciclo de estudos): an ordered queue of study blocks with no fixed weekday.
 * When every block of a lap is closed, the queue starts again. Shapes mirror the backend DTOs
 * under `/api/v1/notebook/cycles` and `/api/v1/notebook/sessions`.
 *
 * A block's goal is either TIME (minutes) or GOAL (understand a page). For a GOAL block the
 * planned minutes are an estimate that lays out the day and rotates subjects; the block closes
 * when its page is done (and its quiz passed, when the block asks for it).
 */

export type Weekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export type BlockMode = 'TIME' | 'GOAL';
/** NEXT follows the topic's roadmap by itself; PAGE is a page the person chose. */
export type GoalSource = 'NEXT' | 'PAGE';
/**
 * Where a block stands in the current lap. TURN_USED is a GOAL block whose estimate ran out
 * before the page was done: the cycle moved on and the topic's next block takes the concept up.
 */
export type LapBlockState = 'OPEN' | 'DONE' | 'UNDERSTOOD' | 'TURN_USED';

export type StudyTopicRef = { id: string; title: string; icon: string | null };
export type StudyPageRef = { id: string; title: string; icon: string | null };

export type CycleDay = { weekday: Weekday; minutes: number; startTime: string | null };
export type CycleTopic = { topicId: string; importance: number; mastery: number; minutesOverride: number | null };

export type CycleConfigRequest = {
    name: string;
    defaultMode: BlockMode;
    maxBlockMinutes: number;
    /** Exactly seven, one per weekday. */
    days: CycleDay[];
    /** In display order. */
    topics: CycleTopic[];
};

export type PlanRequest = { days: CycleDay[]; maxBlockMinutes: number; topics: CycleTopic[] };

export type PlanTopic = {
    topicId: string;
    weight: number;
    /** 0..1 */
    share: number;
    suggestedMinutes: number;
    minutes: number;
    blocks: number;
};

export type PlanResponse = {
    weekMinutes: number;
    plannedMinutes: number;
    /** Days one lap takes at the week's pace; null when the week has no minutes. */
    lapDays: number | null;
    topics: PlanTopic[];
    blocks: { position: number; topicId: string; plannedMinutes: number }[];
};

export type BlockTarget = StudyPageRef & {
    status: 'TO_STUDY' | 'STUDYING' | 'DONE';
    progress: { done: number; total: number };
};

export type BlockProgress = {
    lapNumber: number;
    minutes: number;
    state: LapBlockState;
    closedAt: string | null;
    target: BlockTarget | null;
    /** A NEXT target shown ahead of time, not yet fixed on the block. */
    targetPreview: boolean;
    /** Null when the block does not ask for the quiz. */
    quizPassed: boolean | null;
};

export type StudyBlock = {
    id: string;
    position: number;
    topic: StudyTopicRef;
    mode: BlockMode;
    plannedMinutes: number;
    goalSource: GoalSource | null;
    page: StudyPageRef | null;
    requireQuiz: boolean;
    note: string | null;
    progress: BlockProgress;
};

export type LapSummary = {
    number: number;
    startedAt: string;
    closedAt: string | null;
    minutes: number;
    plannedMinutes: number;
    blocksClosed: number;
    blocks: number;
    understood: number;
    turnsUsed: number;
};

export type StudyCycle = {
    id: string;
    name: string;
    defaultMode: BlockMode;
    maxBlockMinutes: number;
    position: number;
    days: CycleDay[];
    topics: (CycleTopic & { topic: StudyTopicRef })[];
    lap: LapSummary;
    blocks: StudyBlock[];
    /** Newest first, at most five. */
    previousLaps: LapSummary[];
};

export type StudyCycleSummary = {
    id: string;
    name: string;
    position: number;
    lap: LapSummary;
    today: { minutes: number; startTime: string | null };
};

export type TodayEntry = {
    blockId: string;
    position: number;
    topic: StudyTopicRef;
    mode: BlockMode;
    goalSource: GoalSource | null;
    page: StudyPageRef | null;
    note: string | null;
    requireQuiz: boolean;
    plannedMinutes: number;
    /** Minutes the block already holds in its lap. */
    credited: number;
    /** This block's share of today's budget. */
    minutesToday: number;
    state: LapBlockState;
    /** Closed today; listed first. */
    doneToday: boolean;
    /** From the next lap: the budget outlasted this one. */
    nextLap: boolean;
    /** "HH:mm", null when the day has no start time. */
    start: string | null;
    end: string | null;
    target: BlockTarget | null;
    targetPreview: boolean;
    quizPassed: boolean | null;
    cardsDue: number;
};

export type StudyTodayCycle = {
    cycleId: string;
    name: string;
    startTime: string | null;
    dayMinutes: number;
    studiedMinutes: number;
    lapNumber: number;
    position: number;
    blocksInLap: number;
    entries: TodayEntry[];
};

export type StudyToday = {
    date: string;
    weekday: Weekday;
    plannedMinutes: number;
    studiedMinutes: number;
    blocksDone: number;
    blocksTotal: number;
    cycles: StudyTodayCycle[];
    restingCycles: { cycleId: string; name: string }[];
};

export type BlockRequest = {
    id: string | null;
    topicId: string;
    mode: BlockMode;
    plannedMinutes: number;
    goalSource: GoalSource | null;
    pageId: string | null;
    requireQuiz: boolean;
    note: string | null;
};

export type BlockPatch = Partial<Omit<BlockRequest, 'id' | 'topicId'>>;

export type SessionRequest = {
    topicId: string;
    pageId: string | null;
    minutes: number;
    /** "YYYY-MM-DD", within the last 30 days. */
    studiedOn: string;
    note: string | null;
};

export type SessionResponse = {
    id: string;
    credited: {
        cycleId: string;
        cycleName: string;
        blockId: string;
        position: number;
        minutesBefore: number;
        minutesAfter: number;
        plannedMinutes: number;
        state: LapBlockState;
    } | null;
};

export type HistoryEntry =
    | { kind: 'FOCUS'; at: string; topic: StudyTopicRef; page: StudyPageRef | null; minutes: number }
    | { kind: 'MANUAL'; at: string; sessionId: string; topic: StudyTopicRef; page: StudyPageRef | null; minutes: number; note: string | null }
    | { kind: 'UNDERSTOOD'; at: string; topic: StudyTopicRef; page: StudyPageRef | null; minutes: number }
    | { kind: 'LAP_CLOSED'; at: string; lapNumber: number };

export type StudyHistoryDay = {
    date: string;
    plannedMinutes: number;
    minutes: number;
    byTopic: { topicId: string; minutes: number }[];
    entries: HistoryEntry[];
};

export type StudyHistory = {
    cycleId: string;
    from: string;
    to: string;
    topics: StudyTopicRef[];
    days: StudyHistoryDay[];
};
