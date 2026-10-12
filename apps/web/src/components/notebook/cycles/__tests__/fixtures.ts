import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "@beyou/state/rootReducer";
import { WEEKDAYS } from "@beyou/state";
import type {
    BlockTarget, LapSummary, StudyBlock, StudyCycle, StudyToday, StudyTodayCycle, TodayEntry,
} from "@beyou/types/notebook/studyCycle";
import type { NotebookHome, NotebookTree, TopicSummary, TreeItem } from "@beyou/types/notebook/notebook";

/** The sample data of the design canvas, trimmed: invented, like the canvas's. */

export const topic = (id: string, title = id, rootTitle: string | null = null) => ({ id, title, icon: null, rootTitle });

/** A page of a notebook tree; `linked` marks a node whose home is another topic. */
export const treeItem = (id: string, parentId: string, position: number, over: Partial<TreeItem> = {}): TreeItem => ({
    id, parentId, title: id, icon: null, status: "TO_STUDY", onBoard: true, linked: false,
    progress: { done: 0, total: 1 }, position, ...over,
});

export const tree = (id: string, title: string, items: TreeItem[] = []): NotebookTree => ({
    topic: { id, title, icon: null }, items, sourcesCount: 0, cardsDue: 0,
});

const topicSummary = (id: string, title: string): TopicSummary => ({
    id, title, icon: null, description: null, progress: { done: 0, total: 4 }, cardsDue: 0, sourcesCount: 0, next: null,
    goal: null, habit: null, preview: [], previewEdges: [], updatedAt: "2026-10-01T00:00:00Z",
});

/** The notebook home with these roots, in this order. */
export const notebookHome = (roots: { id: string; title: string }[]): NotebookHome => ({
    topics: roots.map((root) => topicSummary(root.id, root.title)),
    continueStudying: null,
    review: { due: 0, byTopic: [], streak: 0 },
});

/** A `getTopicTree` stand-in that answers from these trees by id. */
export const treesById = (...trees: NotebookTree[]) => async (id: string) => {
    const found = trees.find((candidate) => candidate.topic.id === id);
    return found ? { success: found } : { error: { errorKey: "NOTEBOOK_PAGE_NOT_FOUND" } };
};

/**
 * The notebook the subjects follow-up was reported on, trimmed: Software Engineer holds areas,
 * Fundamentos holds pages of its own.
 */
export const softwareEngineer = tree("se", "Software Engineer", [
    treeItem("fund", "se", 0, { title: "Fundamentos da Computação" }),
    treeItem("redes", "fund", 0, { title: "Redes" }),
    treeItem("impl", "se", 1, { title: "Implementação 2.0" }),
    treeItem("testes", "impl", 0, { title: "Testes" }),
]);

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
