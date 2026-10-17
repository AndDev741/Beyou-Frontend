/**
 * useAgentRefresh maps every domain the assistant can report to a refetch.
 *
 * Mobile shipped without `mood`, so a mood the assistant logged left the diary and the week
 * widget stale on Android and sent "unknown domain" to GlitchTip on every such turn. The list
 * below is every domain `AgentToolDomains` on the backend can emit; a new one there needs a
 * refresher here, on web, and a line in this list.
 */
jest.mock('@beyou/api', () => {
  // Built inside the factory: the store module logs at import time, before any top-level
  // const in this file exists.
  const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), log: jest.fn() };
  return { ...jest.requireActual('@beyou/api'), getLogger: () => logger };
});
jest.mock('@beyou/api/habits/getHabits', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@beyou/api/categories/getCategories', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@beyou/api/tasks/getTasks', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@beyou/api/goals/getGoals', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@beyou/api/routine/getRoutines', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@beyou/api/routine/getTodayRoutine', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@beyou/api/user/getProfile', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@beyou/api/focus/focusApi', () => ({ listFocusMicroTasks: jest.fn() }));
jest.mock('@beyou/api/mood/moodApi', () => ({ getMoodEntries: jest.fn() }));
jest.mock('@beyou/api/quickNote/quickNoteApi', () => ({
  getQuickNotes: jest.fn(),
  getArchivedQuickNotes: jest.fn(),
}));
jest.mock('@beyou/api/notebook', () => ({
  getNotebookHome: jest.fn(),
  getPage: jest.fn(),
  getBoard: jest.fn(),
  getTopicTree: jest.fn(),
  getStudyToday: jest.fn(),
  getStudyCycles: jest.fn(),
  getStudyCycle: jest.fn(),
}));

import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { getLogger } from '@beyou/api';
import { getMoodEntries } from '@beyou/api/mood/moodApi';
import getHabits from '@beyou/api/habits/getHabits';
import getCategories from '@beyou/api/categories/getCategories';
import getTasks from '@beyou/api/tasks/getTasks';
import getGoals from '@beyou/api/goals/getGoals';
import getRoutines from '@beyou/api/routine/getRoutines';
import getTodayRoutine from '@beyou/api/routine/getTodayRoutine';
import getProfile from '@beyou/api/user/getProfile';
import { listFocusMicroTasks } from '@beyou/api/focus/focusApi';
import { getArchivedQuickNotes, getQuickNotes } from '@beyou/api/quickNote/quickNoteApi';
import { getBoard, getNotebookHome, getPage, getStudyCycle, getStudyCycles, getStudyToday, getTopicTree } from '@beyou/api/notebook';
import '../src/i18n';
import { makeStore } from '../src/store';
import { useAgentRefresh } from '../src/ui/agent/useAgentRefresh';

/** Every domain AgentToolDomains.java can put on a tool result. */
const BACKEND_DOMAINS = [
  'habits',
  'categories',
  'tasks',
  'goals',
  'routines',
  'perfil',
  'focus',
  'notebook',
  'mood',
  'studyCycles',
  'quickNotes',
];

const mockedMood = getMoodEntries as jest.Mock;
const mockLogger = getLogger();

async function runRefresh(domains: string[]) {
  const store = makeStore();
  const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result } = await renderHook(() => useAgentRefresh(), { wrapper });
  await act(async () => {
    await result.current(domains);
  });
  return store;
}

const FETCHERS = [
  getHabits, getCategories, getTasks, getGoals, getRoutines, getTodayRoutine, getProfile,
  listFocusMicroTasks, getNotebookHome, getPage, getBoard, getTopicTree,
  getStudyToday, getStudyCycles, getStudyCycle, getQuickNotes, getArchivedQuickNotes,
] as unknown as jest.Mock[];

beforeEach(() => {
  jest.clearAllMocks();
  // Every other fetch answers "failed", which each refresher already tolerates.
  for (const fetcher of FETCHERS) fetcher.mockResolvedValue({});
  mockedMood.mockResolvedValue({ success: [] });
});

test('a mood the assistant logged lands in the shared slice the diary and the widget read', async () => {
  mockedMood.mockResolvedValue({
    success: [{ id: 'm1', date: '2026-10-09', mood: 4, note: null, updatedAt: '2026-10-09T08:00:00Z' }],
  });

  const store = await runRefresh(['mood']);

  expect(mockedMood).toHaveBeenCalledTimes(1);
  expect(store.getState().mood.byDate['2026-10-09']?.mood).toBe(4);
  expect(mockLogger.error).not.toHaveBeenCalled();
});

test('re-reads the week the widget draws, ending today', async () => {
  await runRefresh(['mood']);

  const [range] = mockedMood.mock.calls[0];
  expect(range.to >= range.from).toBe(true);
  const days = (Date.parse(range.to) - Date.parse(range.from)) / 86_400_000;
  expect(days).toBe(6);
});

test('a cycle or a session the assistant wrote reaches the study cycles slice', async () => {
  const today = {
    date: '2026-10-11', weekday: 'SUNDAY', plannedMinutes: 60, studiedMinutes: 25, blocksDone: 0, blocksTotal: 1,
    cycles: [], restingCycles: [],
  };
  (getStudyToday as jest.Mock).mockResolvedValue({ success: today });
  (getStudyCycles as jest.Mock).mockResolvedValue({ success: [] });

  const store = await runRefresh(['studyCycles']);

  expect(store.getState().studyCycles.today).toEqual(today);
  expect(mockLogger.error).not.toHaveBeenCalled();
});

test('a note the assistant stuck on the board reaches the quick notes slice', async () => {
  const note = {
    id: 'q1', text: 'Book the dentist', color: 'YELLOW', x: 0, y: 0, z: 1, archivedAt: null,
    convertedTaskId: null, createdAt: '2026-10-17T10:00:00Z', updatedAt: '2026-10-17T10:00:00Z',
  };
  (getQuickNotes as jest.Mock).mockResolvedValue({ success: [note] });

  const store = await runRefresh(['quickNotes']);

  expect(store.getState().quickNotes.active).toEqual([note]);
  // The archived list was never opened, so it is not fetched either.
  expect(getArchivedQuickNotes).not.toHaveBeenCalled();
  expect(mockLogger.error).not.toHaveBeenCalled();
});

test.each(BACKEND_DOMAINS)('knows the "%s" domain', async (domain) => {
  await runRefresh([domain]);

  expect(mockLogger.error).not.toHaveBeenCalledWith(expect.stringContaining('unknown domain'));
});
