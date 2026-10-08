import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import type { DailyBriefing, BriefingGoal, BriefingOpenItem } from '@beyou/types/briefing/briefing';
import type { MoodEntry } from '@beyou/types/mood/mood';
import { getMoodEntries, saveMoodEntry, setMoodLevel } from '@beyou/api/mood/moodApi';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import DailyBriefingSheet from '../src/ui/briefing/DailyBriefingSheet';

// The sheet reads yesterday's and today's mood itself. Mocked at the module so each case
// says which days exist, and so a write can be asserted by the day it lands on.
jest.mock('@beyou/api/mood/moodApi', () => ({
  getMoodEntries: jest.fn(),
  setMoodLevel: jest.fn(),
  saveMoodEntry: jest.fn(),
}));
const mockGetMoodEntries = getMoodEntries as jest.Mock;
const mockSetMoodLevel = setMoodLevel as jest.Mock;
const mockSaveMoodEntry = saveMoodEntry as jest.Mock;

const mood = (over: Partial<MoodEntry> = {}): MoodEntry => ({
  id: 'mood-1',
  date: '2026-09-12',
  mood: 4,
  note: null,
  updatedAt: '2026-09-12T21:00:00Z',
  ...over,
});

beforeEach(() => {
  mockGetMoodEntries.mockReset().mockResolvedValue({ success: [] });
  mockSetMoodLevel.mockReset();
  mockSaveMoodEntry.mockReset();
});

/**
 * The native sheet's rendering rules, mirroring the web suite case for case.
 *
 * The pair matters more than either half: the two clients share `@beyou/state`'s rules and
 * the same i18n keys, so a divergence here is the platforms drifting rather than one of them
 * being wrong.
 *
 * Unlike the web suite, this one imports `../src/i18n`, so `t()` resolves for real and the
 * assertions read the shipped English copy. That is the convention here, and it has a bonus:
 * a key renamed on one platform and not the other fails loudly instead of matching itself.
 */

const item = (over: Partial<BriefingOpenItem> = {}): BriefingOpenItem => ({
  snapshotId: 'snap-1',
  snapshotCheckId: 'check-1',
  date: '2026-09-12',
  routineId: 'routine-1',
  routineName: 'Morning',
  itemType: 'HABIT',
  itemName: 'Stretch',
  itemIconId: 'lucide:activity',
  sectionName: 'Warm-up',
  xpIfCheckedNow: 8.4,
  ...over,
});

const briefing = (over: Partial<DailyBriefing> = {}): DailyBriefing => ({
  date: '2026-09-13',
  yesterday: {
    date: '2026-09-12',
    hadRoutine: true,
    complete: false,
    doneCount: 2,
    skippedCount: 1,
    xpEarned: 34,
    openItems: [item()],
    focusCycles: 0,
    moodLevel: null,
  },
  today: {
    scheduledItemCount: 5,
    scheduledToday: true,
    currentStreak: 4,
    bestStreak: 9,
    goalsApproaching: [],
    recovery: null,
    goalsAhead: [],
  },
  narrative: { status: 'READY', todayLines: ['Two things need you before noon.'], yesterdayLines: [] },
  seenAt: null,
  ...over,
});

/**
 * `render` goes inside `act`, per this app's jest rule: `BeyouThemeProvider` settles after
 * mount, and an unwrapped render leaves the tree uncommitted when the first query runs.
 */
const renderSheet = async (value: DailyBriefing, onResolve: jest.Mock = jest.fn()) => {
  await act(async () => {
    render(
      <Provider store={makeStore()}>
        <BeyouThemeProvider>
          <DailyBriefingSheet
            briefing={value}
            visible
            onClose={jest.fn()}
            onResolve={onResolve}
            pendingId={null}
            locale="en-US"
          />
        </BeyouThemeProvider>
      </Provider>,
    );
  });
  return onResolve;
};

test('lists the open items with what a late check is worth', async () => {
  await renderSheet(briefing());

  expect(screen.getAllByTestId('briefing-open-item')).toHaveLength(1);
  expect(screen.getByText('Stretch')).toBeTruthy();
  expect(screen.getByText('worth 8 XP now')).toBeTruthy();
});

/** A skip is an answer already given. It belongs in the summary, not the worklist. */
test('counts skips in the summary rather than the worklist', async () => {
  await renderSheet(briefing());

  expect(screen.getAllByTestId('briefing-open-item')).toHaveLength(1);
  expect(screen.getByText('2 done, 1 skipped')).toBeTruthy();
});

test('a finished yesterday shows the closed state and no worklist', async () => {
  await renderSheet(
    briefing({
      yesterday: {
        date: '2026-09-12',
        hadRoutine: true,
        complete: true,
        doneCount: 5,
        skippedCount: 0,
        xpEarned: 70,
        openItems: [],
        focusCycles: 1,
        moodLevel: 4,
      },
    }),
  );

  expect(screen.queryAllByTestId('briefing-open-item')).toHaveLength(0);
  expect(screen.getByText('Yesterday is closed')).toBeTruthy();
});

/** A day nothing was scheduled on is not a day the user succeeded at. */
test('a day with no routine is not reported as a finished day', async () => {
  await renderSheet(
    briefing({
      yesterday: {
        date: '2026-09-12',
        hadRoutine: false,
        complete: false,
        doneCount: 0,
        skippedCount: 0,
        xpEarned: 0,
        openItems: [],
        focusCycles: 0,
        moodLevel: null,
      },
    }),
  );

  expect(screen.getByText('Nothing was on yesterday')).toBeTruthy();
  expect(screen.queryByText('Yesterday is closed')).toBeNull();
});

test('checking a row reports the item and the outcome', async () => {
  const onResolve = jest.fn();
  await renderSheet(briefing(), onResolve);

  await act(async () => {
    fireEvent.press(screen.getByTestId('briefing-check'));
  });

  expect(onResolve).toHaveBeenCalledWith(
    expect.objectContaining({ snapshotCheckId: 'check-1' }),
    'checked',
  );
});

test('skipping a row reports it as skipped', async () => {
  const onResolve = jest.fn();
  await renderSheet(briefing(), onResolve);

  await act(async () => {
    fireEvent.press(screen.getByTestId('briefing-skip'));
  });

  expect(onResolve).toHaveBeenCalledWith(expect.anything(), 'skipped');
});

/** An unscheduled day cannot break a streak, and the copy must not imply otherwise. */
test('says nothing is at risk when no routine covers today', async () => {
  await renderSheet(
    briefing({
      today: {
        scheduledItemCount: 0,
        scheduledToday: false,
        currentStreak: 4,
        bestStreak: 9,
        goalsApproaching: [],
        recovery: null,
        goalsAhead: [],
      },
    }),
  );

  expect(screen.getByText(/nothing is at risk/i)).toBeTruthy();
});

test('older recoverable days stay behind a disclosure', async () => {
  await renderSheet(
    briefing({
      today: {
        ...briefing().today,
        recovery: {
          oldestOpenDay: '2026-09-07',
          daysUntilExpiry: 1,
          remainingXpPercent: 20,
          openItems: [item({ snapshotCheckId: 'old-1', itemName: 'Journal' })],
        },
      },
    }),
  );

  expect(screen.getAllByTestId('briefing-open-item')).toHaveLength(1);

  await act(async () => {
    fireEvent.press(screen.getByTestId('briefing-older-toggle'));
  });

  expect(screen.getAllByTestId('briefing-open-item')).toHaveLength(2);
  expect(screen.getByText('Journal')).toBeTruthy();
});

/** One day left is the only genuinely time-critical thing this sheet says. */
test('the last night before a day expires reads as a last chance', async () => {
  await renderSheet(
    briefing({
      today: {
        ...briefing().today,
        recovery: {
          oldestOpenDay: '2026-09-07',
          daysUntilExpiry: 1,
          remainingXpPercent: 20,
          openItems: [item({ snapshotCheckId: 'old-1' })],
        },
      },
    }),
  );

  expect(screen.getByText(/last chance tonight/i)).toBeTruthy();
  expect(screen.queryByText(/stops being checkable/i)).toBeNull();
});

test('a missing narrative falls back to a line and keeps every fact', async () => {
  await renderSheet(briefing({ narrative: { status: 'UNAVAILABLE', todayLines: [], yesterdayLines: [] } }));

  expect(screen.getByTestId('briefing-narrative-unavailable')).toBeTruthy();
  expect(screen.getByTestId('briefing-today-page')).toBeTruthy();
  expect(screen.getAllByTestId('briefing-open-item')).toHaveLength(1);
});

/**
 * The older list is grouped by day because a row there says only its section and its value,
 * and neither answers "did I do this?".
 */
test('the older list heads each day with its date', async () => {
  await renderSheet(
    briefing({
      today: {
        ...briefing().today,
        recovery: {
          oldestOpenDay: '2026-09-07',
          daysUntilExpiry: 3,
          remainingXpPercent: 40,
          openItems: [
            item({ snapshotCheckId: 'old-1', itemName: 'Journal', date: '2026-09-07' }),
            item({ snapshotCheckId: 'old-2', itemName: 'Walk', date: '2026-09-09' }),
          ],
        },
      },
    }),
  );

  await act(async () => {
    fireEvent.press(screen.getByTestId('briefing-older-toggle'));
  });

  // By testID, because the deadline line above the list names the oldest day too — that
  // duplication is correct, so the assertion has to be precise rather than the UI quieter.
  expect(screen.getByTestId('briefing-day-2026-09-07')).toBeTruthy();
  expect(screen.getByTestId('briefing-day-2026-09-09')).toBeTruthy();
});

/** Only the day about to fall out of the window is flagged. */
test('marks the expiring day and no other', async () => {
  await renderSheet(
    briefing({
      today: {
        ...briefing().today,
        recovery: {
          oldestOpenDay: '2026-09-07',
          daysUntilExpiry: 1,
          remainingXpPercent: 20,
          openItems: [
            item({ snapshotCheckId: 'old-1', date: '2026-09-07' }),
            item({ snapshotCheckId: 'old-2', date: '2026-09-09' }),
          ],
        },
      },
    }),
  );

  await act(async () => {
    fireEvent.press(screen.getByTestId('briefing-older-toggle'));
  });

  expect(screen.getAllByText('last chance')).toHaveLength(1);
});

/**
 * Nothing advances this on its own, so the tabs are the only way through.
 */
test('the recap page is reached from the tabs, and only from the tabs', async () => {
  await renderSheet(briefing());

  expect(screen.getByTestId('briefing-today-page')).toBeTruthy();

  await act(async () => {
    fireEvent.press(screen.getByTestId('briefing-bullet-yesterday'));
  });

  expect(screen.getByTestId('briefing-recap-page')).toBeTruthy();
});

const goal = (over: Partial<BriefingGoal> = {}): BriefingGoal => ({
  id: 'goal-1',
  name: 'Read 12 books',
  iconId: 'lucide:book',
  currentValue: 3,
  targetValue: 12,
  unit: 'books',
  endDate: '2026-10-01',
  daysRemaining: 18,
  percentComplete: 25,
  remainingValue: 9,
  requiredPerDay: 0.5,
  expectedPercent: 70,
  pace: 'BEHIND',
  ...over,
});

/** The future half: goals from goalsAhead, each with the pace the server decided. */
test('shows the goals ahead with their pace', async () => {
  const value = briefing();
  value.today = { ...value.today, goalsAhead: [goal()] };
  await renderSheet(value);

  expect(screen.getByText("Where you're heading")).toBeTruthy();
  expect(screen.getByText('Read 12 books')).toBeTruthy();
  expect(screen.getByText('Behind pace. 0.5 books a day still gets you there.')).toBeTruthy();
  expect(screen.getByTestId('briefing-goal-expected')).toBeTruthy();
});

test('a met target is pointed at completion, with no pace tick', async () => {
  const value = briefing();
  value.today = {
    ...value.today,
    goalsAhead: [goal({ pace: 'REACHED', requiredPerDay: null, percentComplete: 100 })],
  };
  await renderSheet(value);

  expect(screen.getByText('Target reached. Mark it done to collect the XP.')).toBeTruthy();
  expect(screen.queryByTestId('briefing-goal-expected')).toBeNull();
});

/** Yesterday's journal, read from the mood API and shown with the privacy line under it. */
test('the recap page shows yesterday\'s mood and journal', async () => {
  mockGetMoodEntries.mockResolvedValue({
    success: [mood({ note: 'Long day, good talk with my sister.' })],
  });
  await renderSheet(briefing());

  await act(async () => {
    fireEvent.press(screen.getByTestId('briefing-bullet-yesterday'));
  });

  expect(screen.getByText("Yesterday's mood: Good")).toBeTruthy();
  expect(screen.getByText('Long day, good talk with my sister.')).toBeTruthy();
  expect(screen.getByText(/never sees your journal/)).toBeTruthy();
  expect(mockGetMoodEntries).toHaveBeenCalledWith(
    { from: '2026-09-12', to: '2026-09-13' },
    expect.anything(),
  );
});

/** A face lands on the briefing's own day, through the PATCH that cannot touch a note. */
test('picking a face records today\'s mood without touching the journal', async () => {
  mockSetMoodLevel.mockResolvedValue({ success: mood({ date: '2026-09-13', mood: 5 }) });
  await renderSheet(briefing());

  await act(async () => {
    fireEvent.press(screen.getByTestId('briefing-mood-face-5'));
  });

  expect(mockSetMoodLevel).toHaveBeenCalledWith('2026-09-13', 5, expect.anything());
  expect(mockSaveMoodEntry).not.toHaveBeenCalled();
});

/**
 * The note editor only exists once today's entry has been read, and it opens on the text
 * already there. Otherwise a quick line here would PUT over a longer entry written elsewhere.
 */
test('the note opens on what is already written and saves it with the mood', async () => {
  mockGetMoodEntries.mockResolvedValue({
    success: [mood({ id: 'today', date: '2026-09-13', mood: 3, note: 'Written on the web' })],
  });
  mockSaveMoodEntry.mockResolvedValue({
    success: mood({ id: 'today', date: '2026-09-13', mood: 3, note: 'Written on the web, and more' }),
  });
  await renderSheet(briefing());

  await act(async () => {
    fireEvent.press(screen.getByTestId('briefing-mood-note-toggle'));
  });
  expect(screen.getByTestId('briefing-mood-note').props.value).toBe('Written on the web');

  await act(async () => {
    fireEvent.changeText(screen.getByTestId('briefing-mood-note'), 'Written on the web, and more');
  });
  await act(async () => {
    fireEvent.press(screen.getByTestId('briefing-mood-note-save'));
  });

  expect(mockSaveMoodEntry).toHaveBeenCalledWith(
    '2026-09-13',
    { mood: 3, note: 'Written on the web, and more' },
    expect.anything(),
  );
});

test('there is no note to write before a mood exists for today', async () => {
  await renderSheet(briefing());

  expect(screen.getByTestId('briefing-mood-face-1')).toBeTruthy();
  expect(screen.queryByTestId('briefing-mood-note-toggle')).toBeNull();
});
