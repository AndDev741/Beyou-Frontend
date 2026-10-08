jest.mock('@beyou/api', () => ({
  ...jest.requireActual('@beyou/api'),
  getDailyBriefing: jest.fn(),
  getBriefingNarrative: jest.fn(),
  markBriefingSeen: jest.fn(),
}));
jest.mock('@beyou/api/routine/snapshot', () => ({
  checkSnapshotItem: jest.fn(),
  skipSnapshotItem: jest.fn(),
}));
jest.mock('@beyou/state/user/refreshUiThunk', () => ({ applyRefreshUi: jest.fn() }));
import { renderHook, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import type { BriefingOpenItem, DailyBriefing } from '@beyou/types/briefing/briefing';
import { getBriefingNarrative, getDailyBriefing, markBriefingSeen } from '@beyou/api';
import { checkSnapshotItem } from '@beyou/api/routine/snapshot';
import '../src/i18n';
import { makeStore } from '../src/store';
import { useDailyBriefing } from '../src/dashboard/useDailyBriefing';

/**
 * The native twin of the web hook's suite: one dashboard reload on close rather than one per
 * check, and the prose polled while the sheet is up. Same rules, same reasons; see the web
 * `useDailyBriefing.test.tsx` for the longer version.
 */

const item = (id: string): BriefingOpenItem => ({
  snapshotId: 'snap-' + id,
  snapshotCheckId: id,
  date: '2026-09-12',
  routineId: 'routine',
  routineName: 'Morning',
  itemType: 'HABIT',
  itemName: 'Item ' + id,
  itemIconId: null,
  sectionName: 'Warm-up',
  xpIfCheckedNow: 8,
});

const briefing = (over: Partial<DailyBriefing> = {}): DailyBriefing => ({
  date: '2026-09-13',
  yesterday: {
    date: '2026-09-12',
    hadRoutine: true,
    complete: false,
    doneCount: 0,
    skippedCount: 0,
    xpEarned: 0,
    openItems: [item('a'), item('b')],
    focusCycles: 0,
    moodLevel: null,
  },
  today: {
    scheduledItemCount: 3,
    scheduledToday: true,
    currentStreak: 1,
    bestStreak: 2,
    goalsApproaching: [],
    recovery: null,
    goalsAhead: [],
  },
  narrative: { status: 'READY', todayLines: ['t'], yesterdayLines: ['y'] },
  seenAt: null,
  ...over,
});

const wrapper =
  (store: ReturnType<typeof makeStore>) =>
  ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;

beforeEach(() => {
  (getDailyBriefing as jest.Mock).mockReset();
  (getBriefingNarrative as jest.Mock).mockReset();
  (markBriefingSeen as jest.Mock).mockReset().mockResolvedValue({ success: true });
  (checkSnapshotItem as jest.Mock).mockReset().mockResolvedValue({ success: {} });
});

afterEach(() => {
  jest.useRealTimers();
});

test('reloads the dashboard once on close, not after every check', async () => {
  (getDailyBriefing as jest.Mock).mockResolvedValue({ success: briefing() });
  const onResolved = jest.fn();
  const { result } = await renderHook(
    () => useDailyBriefing({ tutorialActive: false, onResolved }),
    { wrapper: wrapper(makeStore()) },
  );
  await act(async () => {});
  expect(result.current.visible).toBe(true);

  await act(async () => {
    await result.current.resolve(item('a'), 'checked');
  });
  await act(async () => {
    await result.current.resolve(item('b'), 'checked');
  });
  expect(checkSnapshotItem).toHaveBeenCalledTimes(2);
  expect(onResolved).not.toHaveBeenCalled();

  await act(async () => {
    result.current.close();
  });
  expect(onResolved).toHaveBeenCalledTimes(1);
});

test('closing without checking anything does not reload', async () => {
  (getDailyBriefing as jest.Mock).mockResolvedValue({ success: briefing() });
  const onResolved = jest.fn();
  const { result } = await renderHook(
    () => useDailyBriefing({ tutorialActive: false, onResolved }),
    { wrapper: wrapper(makeStore()) },
  );
  await act(async () => {});

  await act(async () => {
    result.current.close();
  });
  expect(onResolved).not.toHaveBeenCalled();
});

test('asks for the prose while the sheet is up and swaps it in when it lands', async () => {
  jest.useFakeTimers();
  (getDailyBriefing as jest.Mock).mockResolvedValue({
    success: briefing({ narrative: { status: 'PENDING', todayLines: [], yesterdayLines: [] } }),
  });
  (getBriefingNarrative as jest.Mock).mockResolvedValue({
    success: { status: 'READY', todayLines: ['Ahead.'], yesterdayLines: ['Behind.'] },
  });
  const { result } = await renderHook(() => useDailyBriefing({ tutorialActive: false }), {
    wrapper: wrapper(makeStore()),
  });
  await act(async () => {});
  expect(result.current.briefing?.narrative.status).toBe('PENDING');

  await act(async () => {
    await jest.advanceTimersByTimeAsync(2000);
  });

  expect(getBriefingNarrative).toHaveBeenCalledTimes(1);
  expect(result.current.briefing?.narrative.todayLines).toEqual(['Ahead.']);
});
