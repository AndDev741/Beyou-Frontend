import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "@beyou/state/rootReducer";
import { WEEKDAYS } from "@beyou/state";
import type {
    BlockTarget, LapSummary, StudyBlock, StudyCycle, StudyToday, StudyTodayCycle, TodayEntry,
} from "@beyou/types/notebook/studyCycle";

/** The sample data of the design canvas, trimmed: invented, like the canvas's. */

export const topic = (id: string, title = id) => ({ id, title, icon: null });

export const target = (over: Partial<BlockTarget> = {}): BlockTarget => ({
    id: "p-controle", title: "Controle de constitucionalidade", icon: null, status: "STUDYING",
    progress: { done: 2, total: 5 }, ...over,
});

export const entry = (over: Partial<TodayEntry> = {}): TodayEntry => ({
    blockId: "b7", position: 7, topic: topic("const", "Dir. Constitucional"), mode: "TIME", goalSource: null,
    page: null, note: null, requireQuiz: false, plannedMinutes: 70, credited: 0, minutesToday: 70, state: "OPEN",
    doneToday: false, nextLap: false, start: null, end: null, target: null, targetPreview: false, quizPassed: null,
    cardsDue: 0, ...over,
});

export const todayCycle = (over: Partial<StudyTodayCycle> = {}): StudyTodayCycle => ({
    cycleId: "trt", name: "Concurso TRT", startTime: "19:00", dayMinutes: 180, studiedMinutes: 0, lapNumber: 4,
    position: 0, blocksInLap: 15, entries: [], ...over,
});

export const today = (over: Partial<StudyToday> = {}): StudyToday => ({
    date: "2026-10-14", weekday: "WEDNESDAY", plannedMinutes: 240, studiedMinutes: 60, blocksDone: 1, blocksTotal: 4,
    cycles: [], restingCycles: [], ...over,
});

export const lap = (over: Partial<LapSummary> = {}): LapSummary => ({
    number: 4, startedAt: "2026-10-10T09:00:00Z", closedAt: null, minutes: 455, plannedMinutes: 1085,
    blocksClosed: 1, blocks: 3, understood: 1, turnsUsed: 0, ...over,
});

export const block = (id: string, topicId: string, position: number, over: Partial<StudyBlock> = {}): StudyBlock => ({
    id, position, topic: topic(topicId), mode: "TIME", plannedMinutes: 75, goalSource: null, page: null,
    requireQuiz: false, note: null,
    progress: { lapNumber: 4, minutes: 0, state: "OPEN", closedAt: null, target: null, targetPreview: false, quizPassed: null },
    ...over,
});

export const cycle = (over: Partial<StudyCycle> = {}): StudyCycle => ({
    id: "trt", name: "Concurso TRT", defaultMode: "GOAL", maxBlockMinutes: 90, position: 0,
    days: WEEKDAYS.map((weekday) => ({ weekday, minutes: weekday === "SUNDAY" ? 0 : 180, startTime: "19:00" })),
    topics: [
        { topicId: "adm", importance: 4, mastery: 2, minutesOverride: null, topic: topic("adm", "Dir. Administrativo") },
        { topicId: "port", importance: 5, mastery: 3, minutesOverride: null, topic: topic("port", "Português") },
    ],
    lap: lap(),
    blocks: [
        block("b1", "adm", 1, { progress: { lapNumber: 4, minutes: 75, state: "DONE", closedAt: "2026-10-12T20:00:00Z", target: null, targetPreview: false, quizPassed: null } }),
        block("b2", "port", 2),
        block("b3", "adm", 3),
    ],
    previousLaps: [],
    ...over,
});

/** A real store, so the components read and write the same slices they do in the app. */
export function makeStore(preload: (state: ReturnType<typeof rootReducer>) => ReturnType<typeof rootReducer> = (s) => s) {
    const base = rootReducer(undefined as never, { type: "@@INIT" } as never);
    return configureStore({ reducer: rootReducer, preloadedState: preload(base) });
}
