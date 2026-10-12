/**
 * Study cycle sample data and a fake server for the cycle screens' tests: the canvas's
 * "Concurso TRT" (three topics) and "Faculdade" (one), shaped like the backend's answers.
 * Not a test file: jest skips `__tests__/fixtures/` (see package.json).
 */
import { setHttpClient } from '@beyou/api';
import { ApiError } from '@beyou/api/httpClient';
import type {
  LapSummary, StudyBlock, StudyCycle, StudyCycleSummary, StudyToday, TodayEntry,
} from '@beyou/types/notebook/studyCycle';

export const TOPICS = {
  const: { id: 'const', title: 'Dir. Constitucional', icon: null },
  port: { id: 'port', title: 'Português', icon: null },
  adm: { id: 'adm', title: 'Dir. Administrativo', icon: null },
  calc: { id: 'calc', title: 'Cálculo II', icon: null },
};

const progress = (over: Partial<StudyBlock['progress']> = {}): StudyBlock['progress'] => ({
  lapNumber: 4, minutes: 0, state: 'OPEN', closedAt: null, target: null, targetPreview: false, quizPassed: null, ...over,
});

export const block = (over: Partial<StudyBlock> & Pick<StudyBlock, 'id' | 'position' | 'topic'>): StudyBlock => ({
  mode: 'TIME', plannedMinutes: 70, goalSource: null, page: null, requireQuiz: false, note: null, progress: progress(), ...over,
});

export const lap = (over: Partial<LapSummary> = {}): LapSummary => ({
  number: 4, startedAt: '2026-10-10T12:00:00Z', closedAt: null, minutes: 155, plannedMinutes: 355,
  blocksClosed: 2, blocks: 5, understood: 1, turnsUsed: 0, ...over,
});

export const trtBlocks = (): StudyBlock[] => [
  block({
    id: 'b1', position: 1, topic: TOPICS.const, mode: 'GOAL', goalSource: 'NEXT',
    progress: progress({
      minutes: 55, state: 'UNDERSTOOD', closedAt: '2026-10-10T13:00:00Z',
      target: { id: 'p-df', title: 'Direitos fundamentais', icon: null, status: 'DONE', progress: { done: 3, total: 3 } },
    }),
  }),
  block({ id: 'b2', position: 2, topic: TOPICS.port, progress: progress({ minutes: 70, state: 'DONE', closedAt: '2026-10-10T14:00:00Z' }) }),
  block({
    id: 'b3', position: 3, topic: TOPICS.const, mode: 'GOAL', goalSource: 'NEXT',
    progress: progress({
      minutes: 30,
      target: { id: 'p-cc', title: 'Controle de constitucionalidade', icon: null, status: 'STUDYING', progress: { done: 2, total: 5 } },
    }),
  }),
  block({
    id: 'b4', position: 4, topic: TOPICS.port, mode: 'GOAL', goalSource: 'PAGE', requireQuiz: true,
    page: { id: 'p-crase', title: 'Crase', icon: null },
    progress: progress({
      target: { id: 'p-crase', title: 'Crase', icon: null, status: 'TO_STUDY', progress: { done: 0, total: 1 } },
      quizPassed: false,
    }),
  }),
  block({ id: 'b5', position: 5, topic: TOPICS.adm, plannedMinutes: 75, note: 'Lista de questões FCC' }),
];

export const trt = (over: Partial<StudyCycle> = {}): StudyCycle => ({
  id: 'trt',
  name: 'Concurso TRT',
  defaultMode: 'GOAL',
  maxBlockMinutes: 90,
  position: 0,
  days: [
    { weekday: 'MONDAY', minutes: 180, startTime: '19:00' },
    { weekday: 'TUESDAY', minutes: 180, startTime: '19:00' },
    { weekday: 'WEDNESDAY', minutes: 180, startTime: '19:00' },
    { weekday: 'THURSDAY', minutes: 180, startTime: '19:00' },
    { weekday: 'FRIDAY', minutes: 120, startTime: '19:00' },
    { weekday: 'SATURDAY', minutes: 240, startTime: '09:00' },
    { weekday: 'SUNDAY', minutes: 0, startTime: null },
  ],
  topics: [
    { topicId: 'const', importance: 5, mastery: 2, minutesOverride: null, topic: TOPICS.const },
    { topicId: 'port', importance: 5, mastery: 3, minutesOverride: null, topic: TOPICS.port },
    { topicId: 'adm', importance: 4, mastery: 2, minutesOverride: 75, topic: TOPICS.adm },
  ],
  lap: lap(),
  blocks: trtBlocks(),
  previousLaps: [lap({ number: 3, startedAt: '2026-10-02T12:00:00Z', closedAt: '2026-10-10T11:00:00Z', minutes: 1060, blocksClosed: 15, blocks: 15, understood: 5 })],
  ...over,
});

export const faculdade = (over: Partial<StudyCycle> = {}): StudyCycle => ({
  id: 'fac',
  name: 'Faculdade',
  defaultMode: 'TIME',
  maxBlockMinutes: 60,
  position: 1,
  days: trt().days.map((day) => ({ ...day, minutes: day.weekday === 'SUNDAY' ? 0 : 60, startTime: '14:00' })),
  topics: [{ topicId: 'calc', importance: 3, mastery: 3, minutesOverride: null, topic: TOPICS.calc }],
  lap: lap({ number: 2, blocksClosed: 1, blocks: 6, understood: 0, minutes: 60, plannedMinutes: 360 }),
  blocks: [block({ id: 'f1', position: 1, topic: TOPICS.calc, plannedMinutes: 60, progress: progress({ minutes: 60, state: 'DONE' }) })],
  previousLaps: [],
  ...over,
});

export const summaryOf = (cycle: StudyCycle): StudyCycleSummary => ({
  id: cycle.id, name: cycle.name, position: cycle.position, lap: cycle.lap, today: { minutes: 180, startTime: '19:00' },
});

export const entry = (over: Partial<TodayEntry> & Pick<TodayEntry, 'blockId' | 'position' | 'topic'>): TodayEntry => ({
  mode: 'TIME', goalSource: null, page: null, note: null, requireQuiz: false, plannedMinutes: 70, credited: 0,
  minutesToday: 70, state: 'OPEN', doneToday: false, nextLap: false, start: null, end: null, target: null,
  targetPreview: false, quizPassed: null, cardsDue: 0, ...over,
});

/** Wednesday: Faculdade's block done at 14:00, Concurso TRT's three blocks from 19:00. */
export const today = (over: Partial<StudyToday> = {}): StudyToday => {
  const blocks = trtBlocks();
  return {
    date: '2026-10-14',
    weekday: 'WEDNESDAY',
    plannedMinutes: 240,
    studiedMinutes: 60,
    blocksDone: 1,
    blocksTotal: 4,
    cycles: [
      {
        cycleId: 'fac', name: 'Faculdade', startTime: '14:00', dayMinutes: 60, studiedMinutes: 60, lapNumber: 2, position: 1,
        blocksInLap: 6,
        entries: [entry({
          blockId: 'f1', position: 1, topic: TOPICS.calc, plannedMinutes: 60, credited: 60, minutesToday: 0, state: 'DONE',
          doneToday: true, start: null, end: null,
        })],
      },
      {
        cycleId: 'trt', name: 'Concurso TRT', startTime: '19:00', dayMinutes: 180, studiedMinutes: 0, lapNumber: 4, position: 0,
        blocksInLap: 5,
        entries: [
          entry({
            blockId: 'b3', position: 3, topic: TOPICS.const, mode: 'GOAL', goalSource: 'NEXT', credited: 30, minutesToday: 40,
            start: '19:00', end: '19:40', target: blocks[2].progress.target, cardsDue: 12,
          }),
          entry({
            blockId: 'b4', position: 4, topic: TOPICS.port, mode: 'GOAL', goalSource: 'PAGE', requireQuiz: true,
            page: blocks[3].page, target: blocks[3].progress.target, quizPassed: false, start: '19:40', end: '20:50',
          }),
          entry({
            blockId: 'b5', position: 5, topic: TOPICS.adm, plannedMinutes: 75, note: 'Lista de questões FCC',
            start: '20:50', end: '22:00',
          }),
        ],
      },
    ],
    restingCycles: [],
    ...over,
  };
};

export const notebookHome = {
  continueStudying: null,
  review: { due: 0, streak: 0, byTopic: [] },
  topics: Object.values(TOPICS).map((topic) => ({
    ...topic, description: null, progress: { done: 1, total: 4 }, cardsDue: 0, sourcesCount: 0, next: null, goal: null,
    habit: topic.id === 'const' ? { id: 'habit-const', name: 'Estudar constitucional' } : null,
    preview: [], previewEdges: [], updatedAt: '2026-10-10T00:00:00Z',
  })),
};

export const topicTree = (topicId: keyof typeof TOPICS) => ({
  topic: TOPICS[topicId],
  items: [
    { id: `${topicId}-a`, parentId: topicId, title: `${TOPICS[topicId].title} A`, icon: null, status: 'TO_STUDY', onBoard: true, linked: false, progress: { done: 0, total: 1 }, position: 0 },
    { id: `${topicId}-a1`, parentId: `${topicId}-a`, title: `${TOPICS[topicId].title} A.1`, icon: null, status: 'TO_STUDY', onBoard: true, linked: false, progress: { done: 0, total: 1 }, position: 0 },
    { id: 'elsewhere', parentId: topicId, title: 'Linked from another topic', icon: null, status: 'TO_STUDY', onBoard: true, linked: true, progress: { done: 0, total: 1 }, position: 1 },
  ],
  sourcesCount: 0,
  cardsDue: 0,
});

/**
 * A root whose areas are subjects of their own, the notebook the subjects follow-up was reported
 * on: Software Engineer holds Fundamentos (with Redes under it) and Implementação 2.0 (with Testes).
 */
export const SE = { id: 'se', title: 'Software Engineer', icon: null };
export const NESTED = {
  fund: { id: 'fund', title: 'Fundamentos da Computação', icon: null, rootTitle: 'Software Engineer' },
  impl: { id: 'impl', title: 'Implementação 2.0', icon: null, rootTitle: 'Software Engineer' },
};
const page = (id: string, parentId: string, title: string, position: number) => ({
  id, parentId, title, icon: null, status: 'TO_STUDY', onBoard: true, linked: false, progress: { done: 0, total: 1 }, position,
});
export const seTree = {
  topic: SE,
  items: [
    page('fund', 'se', 'Fundamentos da Computação', 0),
    page('redes', 'fund', 'Redes', 0),
    page('impl', 'se', 'Implementação 2.0', 1),
    page('testes', 'impl', 'Testes', 0),
  ],
  sourcesCount: 0,
  cardsDue: 0,
};

/** The notebook home with Software Engineer after the canvas's topics. */
export const nestedHome = {
  ...notebookHome,
  topics: [
    ...notebookHome.topics,
    { ...notebookHome.topics[0], id: SE.id, title: SE.title, habit: null },
  ],
};

export type Call = { method: string; url: string; body?: any; params?: any };

type Handler = (call: Call) => unknown;

/**
 * Installs an HttpClient that answers from `routes` ("GET /notebook/cycles/today" → data, or a
 * function of the call, which may return a promise to hold the answer back) and records every
 * call. An unknown route answers 404, the way the real server would.
 */
export function fakeServer(routes: Record<string, unknown | Handler>): Call[] {
  const calls: Call[] = [];
  const answer = async (method: string, url: string, body?: unknown, config?: { params?: unknown }) => {
    const call: Call = { method, url, body, params: config?.params };
    calls.push(call);
    const route = routes[`${method} ${url}`];
    if (route === undefined) throw new ApiError(404, { errorKey: 'NOT_FOUND' });
    const data = await (typeof route === 'function' ? (route as Handler)(call) : route);
    return { data, headers: {} };
  };
  setHttpClient({
    get: (url: string, config?: { params?: unknown }) => answer('GET', url, undefined, config),
    post: (url: string, body?: unknown) => answer('POST', url, body),
    put: (url: string, body?: unknown) => answer('PUT', url, body),
    patch: (url: string, body?: unknown) => answer('PATCH', url, body),
    delete: (url: string) => answer('DELETE', url),
  } as never);
  return calls;
}
