/**
 * Second Brain on the phone. The cases are the web page's (`SecondBrain.test.tsx`), because
 * the rules are the same: one read draws every block, the question list is topped up at most
 * once per visit, the first overview is only written when asked for and an old one is
 * rewritten once, an answer becomes a profile line or a draft for the assistant, and a
 * source that is off says so in the blocks it feeds.
 *
 * Two things are the phone's own and are pinned here too: the refill stamp lives in memory
 * (there is no sessionStorage), and coming back to a screen that stayed mounted counts as a
 * visit, since the web would have opened the page again.
 *
 * Boundary mocked: the Second Brain calls of `@beyou/api`, expo-router, notify and the
 * assistant bus.
 */
const mockPush = jest.fn();
/** The focus callback the screen registered. Calling it again is a return to the screen. */
let mockFocus: (() => void | (() => void)) | null = null;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  // Arrival is the effect, as the other screen tests stub it.
  useFocusEffect: (callback: () => void | (() => void)) => {
    mockFocus = callback;
    require('react').useEffect(() => callback(), [callback]);
  },
}));
jest.mock('../src/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
}));
// Not a wholesale mock: the rest of the package (the logger, the http client) stays real.
jest.mock('@beyou/api', () => ({
  ...jest.requireActual('@beyou/api'),
  getSecondBrain: jest.fn(),
  setSecondBrainSource: jest.fn(),
  createSecondBrainFact: jest.fn(),
  editSecondBrainFact: jest.fn(),
  deleteSecondBrainFact: jest.fn(),
  refillSecondBrainQuestions: jest.fn(),
  answerSecondBrainQuestion: jest.fn(),
  skipSecondBrainQuestion: jest.fn(),
  refreshSecondBrainInsight: jest.fn(),
  editSecondBrainNote: jest.fn(),
  deleteSecondBrainNote: jest.fn(),
  keepSecondBrainOldNoteLine: jest.fn(),
  discardSecondBrainOldNoteLine: jest.fn(),
  deleteSecondBrainOldNote: jest.fn(),
}));
jest.mock('../src/ui/agent/agentPanelBus', () => ({ openAgentPanelWithDraft: jest.fn() }));

import { StrictMode } from 'react';
import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react-native';
import {
  answerSecondBrainQuestion,
  createSecondBrainFact,
  deleteSecondBrainFact,
  deleteSecondBrainNote,
  deleteSecondBrainOldNote,
  discardSecondBrainOldNoteLine,
  editSecondBrainFact,
  editSecondBrainNote,
  getSecondBrain,
  keepSecondBrainOldNoteLine,
  refillSecondBrainQuestions,
  refreshSecondBrainInsight,
  setSecondBrainSource,
  skipSecondBrainQuestion,
} from '@beyou/api';
import { tutorialCompletedEnter } from '@beyou/state/user/perfilSlice';
import {
  SECOND_BRAIN_FACT_LIMIT,
  SECOND_BRAIN_SOURCES,
  type SecondBrainFact,
  type SecondBrainInsight,
  type SecondBrainMemoryGroup,
  type SecondBrainNote,
  type SecondBrainOverview,
  type SecondBrainQuestion,
  type SecondBrainSource,
} from '@beyou/types/secondBrain/secondBrain';
import i18n from '../src/i18n';
import { notify } from '../src/notify';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import { openAgentPanelWithDraft } from '../src/ui/agent/agentPanelBus';
import { useSecondBrain } from '../src/secondBrain/useSecondBrain';
import SecondBrainScreen from '../app/(app)/second-brain';

const mocked = {
  get: getSecondBrain as jest.Mock,
  setSource: setSecondBrainSource as jest.Mock,
  createFact: createSecondBrainFact as jest.Mock,
  editFact: editSecondBrainFact as jest.Mock,
  deleteFact: deleteSecondBrainFact as jest.Mock,
  refill: refillSecondBrainQuestions as jest.Mock,
  answer: answerSecondBrainQuestion as jest.Mock,
  skip: skipSecondBrainQuestion as jest.Mock,
  write: refreshSecondBrainInsight as jest.Mock,
  handOver: openAgentPanelWithDraft as jest.Mock,
  toastError: notify.error as jest.Mock,
  editNote: editSecondBrainNote as jest.Mock,
  deleteNote: deleteSecondBrainNote as jest.Mock,
  keepLine: keepSecondBrainOldNoteLine as jest.Mock,
  discardLine: discardSecondBrainOldNoteLine as jest.Mock,
  clearOldNote: deleteSecondBrainOldNote as jest.Mock,
};

const question = (id: string, kind: SecondBrainQuestion['kind'], text: string): SecondBrainQuestion => ({
  id,
  kind,
  text,
  status: 'OPEN',
  answer: null,
  createdAt: '2026-11-13T09:00:00Z',
  answeredAt: null,
});

const fact = (
  id: string,
  kind: SecondBrainFact['kind'],
  text: string,
  origin: SecondBrainFact['origin'] = 'USER',
): SecondBrainFact => ({
  id,
  kind,
  text,
  origin,
  createdAt: '2026-11-13T09:00:00Z',
  updatedAt: '2026-11-13T09:00:00Z',
});

const NO_OVERVIEW: SecondBrainInsight = { text: null, verdict: null, generatedAt: null, stale: true };

const overview = (patch: Partial<SecondBrainOverview> = {}): SecondBrainOverview => ({
  insight: { text: 'You kept most of the week.', verdict: 'ON_COURSE', generatedAt: '2026-11-13T08:00:00Z', stale: false },
  goalsAhead: [
    {
      id: 'goal-1',
      name: 'Visa interview',
      iconId: 'lucide:plane',
      currentValue: 3,
      targetValue: 10,
      unit: 'sessions',
      endDate: '2026-12-01',
      daysRemaining: 18,
      percentComplete: 30,
      remainingValue: 7,
      requiredPerDay: 0.4,
      expectedPercent: 55,
      pace: 'BEHIND',
    },
  ],
  routine: {
    thisWeekPercent: 72,
    previousWeekPercent: 64,
    slipping: [{ name: 'Read', asked: 5, checked: 1, skipped: 3 }],
    steady: [{ name: 'Gym', asked: 3, checked: 3, skipped: 0 }],
  },
  areas: [
    { categoryId: 'c1', name: 'Health', iconId: null, asked: 12, checked: 10, percent: 83 },
    { categoryId: 'c2', name: 'Study', iconId: null, asked: 10, checked: 3, percent: 30 },
  ],
  questions: [question('q1', 'PROFILE_OBJECTIVES', 'What do you want out of this year?')],
  facts: [fact('f1', 'LIKE', 'Cooking on Sundays')],
  sources: [
    { source: 'ROUTINES', enabled: true },
    { source: 'GOALS', enabled: true },
    { source: 'MOOD', enabled: true },
    { source: 'CALENDAR', enabled: false },
    { source: 'NOTEBOOK', enabled: false },
    { source: 'IDEAS', enabled: false },
  ],
  aiAvailable: true,
  memory: [],
  oldNote: [],
  ...patch,
});

const note = (
  id: string,
  text: string,
  origin: SecondBrainNote['origin'] = 'ANSWER',
  subjectName = 'Gym',
): SecondBrainNote => ({
  id,
  text,
  origin,
  subjectName,
  createdAt: '2026-11-21T10:00:00Z',
  updatedAt: '2026-11-21T10:00:00Z',
});

/**
 * A category with its own note, a habit, and the notes of a habit deleted since, which moved
 * to the category and show as their own subject; then the group of routines and the rest.
 * The same fixture as the web page's test.
 */
const memory = (): SecondBrainMemoryGroup[] => [
  {
    categoryId: 'c1',
    categoryName: 'Health',
    categoryIconId: null,
    subjects: [
      {
        type: 'CATEGORY',
        id: 'c1',
        name: 'Health',
        iconId: null,
        formerType: null,
        notes: [note('n1', "Health is the year's priority", 'ASSISTANT', 'Health')],
      },
      {
        type: 'HABIT',
        id: 'h1',
        name: 'Gym',
        iconId: null,
        formerType: null,
        notes: [note('n2', 'Wants more energy for work'), note('n3', 'Rain is what stops it')],
      },
      {
        type: 'CATEGORY',
        id: 'c1',
        name: 'Swimming',
        iconId: null,
        formerType: 'HABIT',
        notes: [note('n4', 'Stopped when the pool closed', 'ANSWER', 'Swimming')],
      },
    ],
  },
  {
    categoryId: null,
    categoryName: null,
    categoryIconId: null,
    subjects: [
      {
        type: 'ROUTINE',
        id: 'r1',
        name: 'Morning',
        iconId: null,
        formerType: null,
        notes: [note('n5', 'Built around the school run', 'USER', 'Morning')],
      },
    ],
  },
];

const withSource = (source: SecondBrainSource, enabled: boolean) =>
  overview().sources.map((item) => (item.source === source ? { ...item, enabled } : item));

const mockLoad = (value: SecondBrainOverview) => {
  mocked.get.mockResolvedValue({ success: value });
  mocked.refill.mockResolvedValue({ success: value.questions });
};

/**
 * `strict` runs every effect twice, as development React does. The page fires two requests
 * by itself, and rendered plainly a version that asked the model twice would pass.
 */
async function renderScreen({ tutorialDone = true, strict = false } = {}) {
  const store = makeStore();
  store.dispatch(tutorialCompletedEnter(tutorialDone));
  const tree = (
    <Provider store={store}>
      <BeyouThemeProvider>
        <SecondBrainScreen />
      </BeyouThemeProvider>
    </Provider>
  );
  let view!: Awaited<ReturnType<typeof render>>;
  await act(async () => {
    view = await render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  });
  return view;
}

async function press(testID: string) {
  await act(async () => {
    await fireEvent.press(screen.getByTestId(testID));
  });
}

async function type(testID: string, text: string) {
  await act(async () => {
    await fireEvent.changeText(screen.getByTestId(testID), text);
  });
}

/** Back on the screen after another one was on top of it. */
async function comeBack() {
  await act(async () => {
    mockFocus?.();
  });
}

const switchOf = (source: SecondBrainSource) => screen.getByTestId(`second-brain-source-${source}`);
const HIDDEN = { includeHiddenElements: true };

// The refill stamp lives in the module, so it outlasts a test like it outlasts the screen.
// Each test starts two hours after the last one, where the stamp no longer holds anything back.
const realNow = Date.now.bind(Date);
let hoursAhead = 0;
let clock: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  void i18n.changeLanguage('en');
  mockFocus = null;
  hoursAhead += 2;
  clock = jest.spyOn(Date, 'now').mockImplementation(() => realNow() + hoursAhead * 3_600_000);
});

afterEach(() => {
  clock.mockRestore();
});

describe('SecondBrainScreen', () => {
  it('draws every block from one read', async () => {
    mockLoad(overview());
    await renderScreen();

    expect(screen.getByText('You kept most of the week.')).toBeTruthy();
    const goal = screen.getByTestId('second-brain-goal');
    expect(within(goal).getByText('Visa interview')).toBeTruthy();
    expect(within(goal).getByText('18 days left')).toBeTruthy();
    expect(within(goal).getByText('3 of 10 sessions')).toBeTruthy();
    // The fixture goal needs 0.4 a day, so the sentence is the weekly one.
    expect(within(goal).getByText('Behind pace. 2.6 sessions a week still gets you there.')).toBeTruthy();
    // The tick is drawn for the eye only (the sentence above says it), so it is hidden from readers.
    expect(within(goal).getByTestId('second-brain-goal-expected', HIDDEN).props.style.left).toBe('55%');
    expect(screen.getByText('72%')).toBeTruthy();
    expect(screen.getByText('8 points above the week before')).toBeTruthy();
    expect(within(screen.getByTestId('second-brain-slipping')).getByText('Read')).toBeTruthy();
    expect(within(screen.getByTestId('second-brain-steady')).getByText('Gym')).toBeTruthy();
    // A habit skipped again and again says so, in the person's language; one done every time shows no skip count.
    expect(within(screen.getByTestId('second-brain-slipping')).getByText('1 of 5 times')).toBeTruthy();
    expect(within(screen.getByTestId('second-brain-slipping')).getByText('3 skipped')).toBeTruthy();
    expect(within(screen.getByTestId('second-brain-steady')).queryByTestId('second-brain-item-skipped')).toBeNull();
    expect(screen.getByText('What do you want out of this year?')).toBeTruthy();
    expect(screen.getByText('Cooking on Sundays')).toBeTruthy();
    for (const source of SECOND_BRAIN_SOURCES) expect(switchOf(source)).toBeTruthy();
    expect(screen.getByText('Your diary text is never read, on any setting.')).toBeTruthy();

    expect(mocked.get).toHaveBeenCalledTimes(1);
  });

  it('puts the questions second, as the web page does on a narrow screen', async () => {
    mockLoad(overview({ oldNote: ['Has two kids.'] }));
    await renderScreen();

    const order = screen
      .getAllByTestId(/^second-brain-(overview|questions|goals|routine|areas|profile|old-note|memory|sources)$/)
      .map((block) => block.props.testID);
    expect(order).toEqual([
      'second-brain-overview',
      'second-brain-questions',
      'second-brain-goals',
      'second-brain-routine',
      'second-brain-areas',
      'second-brain-profile',
      'second-brain-old-note',
      'second-brain-memory',
      'second-brain-sources',
    ]);
  });

  it('names only the two ends of the ranking', async () => {
    mockLoad(
      overview({
        areas: [
          { categoryId: 'c1', name: 'Health', iconId: null, asked: 12, checked: 10, percent: 83 },
          { categoryId: 'c3', name: 'Home', iconId: null, asked: 8, checked: 4, percent: 50 },
          { categoryId: 'c2', name: 'Study', iconId: null, asked: 10, checked: 3, percent: 30 },
        ],
      }),
    );
    await renderScreen();

    const areas = screen.getAllByTestId('second-brain-area');
    expect(within(areas[0]).getByText('Strongest')).toBeTruthy();
    expect(within(areas[2]).getByText('Weakest')).toBeTruthy();
    expect(within(areas[1]).queryByText('Strongest')).toBeNull();
    expect(within(areas[1]).queryByText('Weakest')).toBeNull();
  });

  describe('the question refill', () => {
    it('asks for more questions once per visit, not once per effect run', async () => {
      mockLoad(overview());
      await renderScreen({ strict: true });

      await waitFor(() => expect(mocked.refill).toHaveBeenCalledTimes(1));
    });

    it('leaves a full question list alone', async () => {
      const five = ['a', 'b', 'c', 'd', 'e'].map((id) => question(id, 'FOLLOW_UP', `Question ${id}`));
      mockLoad(overview({ questions: five }));
      await renderScreen();

      expect(screen.getByText('Question a')).toBeTruthy();
      expect(mocked.refill).not.toHaveBeenCalled();
    });

    /** The stamp is kept in memory for this: the route may end in a model call. */
    it('does not ask again when the person walks out and back in within the hour', async () => {
      mockLoad(overview());
      const first = await renderScreen();
      await waitFor(() => expect(mocked.refill).toHaveBeenCalledTimes(1));
      await act(async () => {
        await first.unmount();
      });

      await renderScreen();

      expect(mocked.get).toHaveBeenCalledTimes(2);
      expect(screen.getByText('What do you want out of this year?')).toBeTruthy();
      expect(mocked.refill).toHaveBeenCalledTimes(1);
    });

    it('asks when the list is empty and shows what comes back', async () => {
      mocked.get.mockResolvedValue({ success: overview({ questions: [] }) });
      mocked.refill.mockResolvedValueOnce({ success: [] });
      await renderScreen();

      expect(mocked.refill).toHaveBeenCalledTimes(1);
      expect(screen.getByText('No questions right now. New ones show up as your week moves.')).toBeTruthy();

      mocked.refill.mockResolvedValueOnce({ success: [question('q7', 'FOLLOW_UP', 'What got in the way of reading?')] });
      await press('second-brain-questions-empty-action');

      expect(screen.getByText('What got in the way of reading?')).toBeTruthy();
      expect(mocked.refill).toHaveBeenCalledTimes(2);
    });
  });

  describe('the overview', () => {
    it('shows the verdict as a label', async () => {
      mockLoad(overview());
      await renderScreen();

      expect(within(screen.getByTestId('second-brain-verdict')).getByText('On course')).toBeTruthy();
    });

    it('draws no label for a verdict it does not know', async () => {
      mockLoad(
        overview({
          insight: { text: 'Something new.', verdict: 'AHEAD' as never, generatedAt: '2026-11-13T08:00:00Z', stale: false },
        }),
      );
      await renderScreen();

      expect(screen.getByText('Something new.')).toBeTruthy();
      expect(screen.queryByTestId('second-brain-verdict')).toBeNull();
    });

    /**
     * Opening the screen sends nothing to the AI provider. The first overview is something
     * the person asks for, from a button that sits beside the notice saying where the text goes.
     */
    it('waits to be asked for the first overview, and says where it will be written', async () => {
      mockLoad(overview({ insight: NO_OVERVIEW }));
      mocked.write.mockResolvedValue({
        success: { text: 'A first read.', verdict: 'TOO_EARLY', generatedAt: '2026-11-13T09:00:00Z', stale: false },
      });
      await renderScreen({ strict: true });

      expect(
        within(screen.getByTestId('second-brain-privacy-notice')).getByText(/written by an external AI provider/),
      ).toBeTruthy();
      expect(mocked.write).not.toHaveBeenCalled();

      await press('second-brain-overview-write');

      expect(screen.getByText('A first read.')).toBeTruthy();
      expect(mocked.write).toHaveBeenCalledTimes(1);
      expect(within(screen.getByTestId('second-brain-verdict')).getByText('Too early to tell')).toBeTruthy();
      // Once it is in use the notice has done its job and is not repeated over every overview.
      expect(screen.queryByTestId('second-brain-privacy-notice')).toBeNull();
    });

    /**
     * The screen exists to say where the person stands today. An overview the server calls
     * stale (written before the account's current day) is rewritten on the visit, with nobody
     * pressing anything.
     */
    it("rewrites yesterday's overview on the first visit of the day, once", async () => {
      mockLoad(
        overview({
          insight: { text: 'Old read.', verdict: 'ON_COURSE', generatedAt: '2026-11-01T09:00:00Z', stale: true },
        }),
      );
      mocked.write.mockResolvedValue({
        success: { text: 'You are drifting.', verdict: 'DRIFTING', generatedAt: '2026-11-13T09:00:00Z', stale: false },
      });
      await renderScreen({ strict: true });

      await waitFor(() => expect(screen.getByText('You are drifting.')).toBeTruthy());
      expect(mocked.write).toHaveBeenCalledTimes(1);
      expect(within(screen.getByTestId('second-brain-verdict')).getByText('Drifting')).toBeTruthy();
      expect(screen.queryByText('Old read.')).toBeNull();
    });

    it("leaves today's overview alone, so a second visit costs no model call", async () => {
      mockLoad(overview());
      await renderScreen();

      expect(screen.getByText('You kept most of the week.')).toBeTruthy();
      expect(mocked.write).not.toHaveBeenCalled();
      expect(screen.queryByTestId('second-brain-privacy-notice')).toBeNull();
    });

    it('hides the old verdict and shows a placeholder while a new overview is written', async () => {
      mockLoad(overview());
      let finish!: (value: unknown) => void;
      mocked.write.mockReturnValue(new Promise((resolve) => (finish = resolve)));
      await renderScreen();

      await press('second-brain-overview-refresh');

      expect(screen.getByTestId('second-brain-overview-writing')).toBeTruthy();
      expect(screen.queryByTestId('second-brain-verdict')).toBeNull();
      expect(screen.queryByText('You kept most of the week.')).toBeNull();

      await act(async () => {
        finish({ success: { text: 'A second read.', verdict: 'DRIFTING', generatedAt: '2026-11-13T10:00:00Z', stale: false } });
      });

      expect(screen.getByText('A second read.')).toBeTruthy();
      expect(within(screen.getByTestId('second-brain-verdict')).getByText('Drifting')).toBeTruthy();
    });

    it('says so in the block when a rewrite fails, and keeps what was there', async () => {
      mockLoad(overview());
      mocked.write.mockResolvedValue({ error: { message: 'The model timed out' } });
      await renderScreen();

      await press('second-brain-overview-refresh');

      expect(screen.getByTestId('second-brain-overview-error')).toHaveTextContent('The model timed out');
      expect(screen.getByText('You kept most of the week.')).toBeTruthy();
      expect(mocked.toastError).not.toHaveBeenCalled();
    });

    it('says the AI is off instead of offering a button that cannot work', async () => {
      mockLoad(overview({ aiAvailable: false, insight: NO_OVERVIEW }));
      await renderScreen();

      expect(screen.getByText('The AI is switched off on this server, so this part stays empty.')).toBeTruthy();
      expect(screen.queryByTestId('second-brain-overview-write')).toBeNull();
      expect(screen.queryByTestId('second-brain-privacy-notice')).toBeNull();
      expect(mocked.write).not.toHaveBeenCalled();
    });

    it('offers no rewrite of an existing overview while the AI is off, and makes no call', async () => {
      mockLoad(
        overview({
          aiAvailable: false,
          insight: { text: 'Old read.', verdict: 'ON_COURSE', generatedAt: '2026-11-01T09:00:00Z', stale: true },
        }),
      );
      await renderScreen();

      expect(screen.getByText('Old read.')).toBeTruthy();
      expect(screen.queryByTestId('second-brain-overview-refresh')).toBeNull();
      expect(mocked.write).not.toHaveBeenCalled();
    });
  });

  describe('the questions', () => {
    it('turns a profile answer into a line of the profile', async () => {
      mockLoad(overview());
      const learned = fact('f2', 'OBJECTIVE', 'Pass the visa interview', 'ANSWER');
      mocked.answer.mockResolvedValue({
        success: {
          question: { ...overview().questions[0], status: 'ANSWERED', answer: 'Pass the visa interview' },
          learned: [learned],
          notes: [],
        },
      });
      await renderScreen();

      await type('second-brain-answer-input', '  Pass the visa interview  ');
      await press('second-brain-answer-send');

      expect(mocked.answer).toHaveBeenCalledWith('q1', 'Pass the visa interview', expect.anything());
      const result = screen.getByTestId('second-brain-answer-result');
      expect(within(result).getByText('Saved to your profile')).toBeTruthy();
      expect(within(result).getByText('Pass the visa interview')).toBeTruthy();
      // A profile answer is the fact itself, so there is nothing for the assistant to act on.
      expect(screen.queryByTestId('second-brain-act')).toBeNull();
      const objectives = screen.getByTestId('second-brain-facts-OBJECTIVE');
      expect(within(objectives).getByText('Pass the visa interview')).toBeTruthy();
      expect(within(objectives).getByText('From an answer')).toBeTruthy();
    });

    it('does not send an answer that is only spaces', async () => {
      mockLoad(overview());
      await renderScreen();

      await type('second-brain-answer-input', '   ');
      await press('second-brain-answer-send');

      expect(mocked.answer).not.toHaveBeenCalled();
    });

    it('offers a check-in answer to the assistant as a draft', async () => {
      const checkIn = question('q9', 'CHECK_IN', 'How is your day going?');
      mockLoad(overview({ questions: [checkIn] }));
      // An ampersand and an apostrophe: escaped, they would reach the assistant as entities.
      const said = "Skipped the gym & didn't read";
      mocked.answer.mockResolvedValue({
        success: { question: { ...checkIn, status: 'ANSWERED', answer: said }, learned: [], notes: [] },
      });
      await renderScreen();

      await type('second-brain-answer-input', said);
      await press('second-brain-answer-send');

      expect(screen.getByText('Noted. Nothing new for your profile in that one.')).toBeTruthy();
      await press('second-brain-act');

      expect(mocked.handOver).toHaveBeenCalledTimes(1);
      expect(mocked.handOver).toHaveBeenCalledWith(
        `You asked: "How is your day going?"\nMy answer: ${said}\n\nDo what this calls for in my routines, habits and tasks.`,
      );
    });

    /** The assistant opens for nobody while onboarding runs, so the button would open nothing. */
    it('does not offer the hand-off while onboarding is still running', async () => {
      const checkIn = question('q9', 'CHECK_IN', 'How is your day going?');
      mockLoad(overview({ questions: [checkIn] }));
      mocked.answer.mockResolvedValue({
        success: { question: { ...checkIn, status: 'ANSWERED', answer: 'Fine' }, learned: [], notes: [] },
      });
      await renderScreen({ tutorialDone: false });

      await type('second-brain-answer-input', 'Fine');
      await press('second-brain-answer-send');

      expect(screen.getByTestId('second-brain-answer-result')).toBeTruthy();
      expect(screen.queryByTestId('second-brain-act')).toBeNull();
    });

    it('drops a skipped question from the list', async () => {
      const two = [question('q1', 'FOLLOW_UP', 'First?'), question('q2', 'FOLLOW_UP', 'Second?')];
      mockLoad(overview({ questions: two }));
      mocked.skip.mockResolvedValue({ success: { ...two[0], status: 'SKIPPED' } });
      await renderScreen();

      expect(screen.getByText('First?')).toBeTruthy();
      await press('second-brain-question-skip');

      expect(mocked.skip).toHaveBeenCalledWith('q1', expect.anything());
      expect(screen.getByText('Second?')).toBeTruthy();
      expect(screen.queryByText('First?')).toBeNull();
      // One question left, so there is nothing to page through.
      expect(screen.queryByTestId('second-brain-question-count')).toBeNull();
    });

    it('shows one question at a time and keeps what was typed for each', async () => {
      const two = [question('q1', 'FOLLOW_UP', 'First?'), question('q2', 'CHECK_IN', 'Second?')];
      mockLoad(overview({ questions: two }));
      await renderScreen();

      expect(screen.getByTestId('second-brain-question-count')).toHaveTextContent('1 of 2');
      expect(screen.queryByText('Second?')).toBeNull();
      expect(screen.getByTestId('second-brain-question-previous').props.accessibilityState.disabled).toBe(true);

      await type('second-brain-answer-input', 'Half an answer');
      await press('second-brain-question-next');

      expect(screen.getByText('Second?')).toBeTruthy();
      expect(screen.queryByText('First?')).toBeNull();
      expect(screen.getByTestId('second-brain-question-count')).toHaveTextContent('2 of 2');
      expect(screen.getByTestId('second-brain-answer-input').props.value).toBe('');
      expect(screen.getByTestId('second-brain-question-next').props.accessibilityState.disabled).toBe(true);

      await press('second-brain-question-previous');

      expect(screen.getByTestId('second-brain-answer-input').props.value).toBe('Half an answer');
    });

    it('keeps the question and says why when the answer cannot be saved', async () => {
      mockLoad(overview());
      mocked.answer.mockResolvedValue({ error: { message: 'Too many requests' } });
      await renderScreen();

      await type('second-brain-answer-input', 'Pass the visa interview');
      await press('second-brain-answer-send');

      expect(mocked.toastError).toHaveBeenCalledWith('Too many requests');
      expect(screen.queryByTestId('second-brain-answer-result')).toBeNull();
      expect(screen.getByTestId('second-brain-answer-input').props.value).toBe('Pass the visa interview');
    });
  });

  describe('the sources', () => {
    it('reads the page again after a source changes, since a source feeds other blocks', async () => {
      mockLoad(overview());
      let finish!: (value: unknown) => void;
      mocked.setSource.mockReturnValue(new Promise((resolve) => (finish = resolve)));
      await renderScreen();
      expect(switchOf('CALENDAR').props.value).toBe(false);

      await act(async () => {
        await fireEvent(switchOf('CALENDAR'), 'valueChange', true);
      });

      expect(mocked.setSource).toHaveBeenCalledWith('CALENDAR', true, expect.anything());
      // While it saves, the switch shows where it is going and all six wait.
      expect(switchOf('CALENDAR').props.value).toBe(true);
      for (const source of SECOND_BRAIN_SOURCES) expect(switchOf(source).props.disabled).toBe(true);

      mocked.get.mockResolvedValue({ success: overview({ sources: withSource('CALENDAR', true) }) });
      await act(async () => {
        finish({ success: withSource('CALENDAR', true) });
      });

      await waitFor(() => expect(mocked.get).toHaveBeenCalledTimes(2));
      expect(switchOf('CALENDAR').props.value).toBe(true);
      for (const source of SECOND_BRAIN_SOURCES) expect(switchOf(source).props.disabled).toBe(false);
    });

    it('puts the switch back and says why when the change is refused', async () => {
      mockLoad(overview());
      mocked.setSource.mockResolvedValue({ error: { message: 'Not now' } });
      await renderScreen();

      await act(async () => {
        await fireEvent(switchOf('MOOD'), 'valueChange', false);
      });

      expect(mocked.toastError).toHaveBeenCalledWith('Not now');
      expect(switchOf('MOOD').props.value).toBe(true);
      expect(mocked.get).toHaveBeenCalledTimes(1);
    });

    it('says a block is switched off rather than showing it empty', async () => {
      mockLoad(overview({ routine: null, areas: [], sources: withSource('ROUTINES', false) }));
      await renderScreen();

      const off = 'This is switched off in your sources.';
      expect(within(screen.getByTestId('second-brain-routine')).getByText(off)).toBeTruthy();
      expect(within(screen.getByTestId('second-brain-areas')).getByText(off)).toBeTruthy();
      expect(within(screen.getByTestId('second-brain-goals')).queryByText(off)).toBeNull();
    });

    it('says the goals are switched off, which is not the same as having none', async () => {
      mockLoad(overview({ goalsAhead: [], sources: withSource('GOALS', false) }));
      await renderScreen();

      const goals = screen.getByTestId('second-brain-goals');
      expect(within(goals).getByText('This is switched off in your sources.')).toBeTruthy();
      expect(within(goals).queryByText('No open goal has a date coming up.')).toBeNull();
    });
  });

  describe('the routines and the goals', () => {
    it('says there are not enough days yet instead of drawing an empty ring', async () => {
      mockLoad(
        overview({ routine: { thisWeekPercent: null, previousWeekPercent: null, slipping: [], steady: [] } }),
      );
      await renderScreen();

      const routine = screen.getByTestId('second-brain-routine');
      expect(within(routine).getByText('Not enough days yet. Check in for a week and this fills in.')).toBeTruthy();
      expect(screen.queryByTestId('second-brain-slipping')).toBeNull();
    });

    it('compares the week with the one before in either direction', async () => {
      mockLoad(
        overview({ routine: { thisWeekPercent: 50, previousWeekPercent: 64, slipping: [], steady: [] } }),
      );
      await renderScreen();

      expect(
        within(screen.getByTestId('second-brain-routine-delta')).getByText('14 points below the week before'),
      ).toBeTruthy();
      expect(screen.getByText('Nothing slipped this week.')).toBeTruthy();
      expect(screen.getByText('No item was done every time it came up.')).toBeTruthy();
    });

    it('opens the goals screen from the block', async () => {
      mockLoad(overview());
      await renderScreen();

      await press('second-brain-goals-link');

      expect(mockPush).toHaveBeenCalledWith('/goals');
    });
  });

  describe('the profile', () => {
    it('adds, edits and removes a profile line', async () => {
      mockLoad(overview());
      mocked.createFact.mockResolvedValue({ success: fact('f3', 'ABOUT', 'Two kids') });
      mocked.editFact.mockResolvedValue({ success: fact('f3', 'ABOUT', 'Two kids and a dog') });
      mocked.deleteFact.mockResolvedValue({ success: true });
      await renderScreen();
      expect(screen.getByTestId('second-brain-fact-count')).toHaveTextContent(`1/${SECOND_BRAIN_FACT_LIMIT}`);

      await press('second-brain-fact-add-ABOUT');
      await type('second-brain-fact-input', '  Two kids ');
      await press('second-brain-fact-save');

      expect(mocked.createFact).toHaveBeenCalledWith({ kind: 'ABOUT', text: 'Two kids' }, expect.anything());
      const about = screen.getByTestId('second-brain-facts-ABOUT');
      expect(within(within(about).getByTestId('second-brain-fact')).getByText('Two kids')).toBeTruthy();
      expect(screen.queryByTestId('second-brain-fact-form')).toBeNull();
      expect(screen.getByTestId('second-brain-fact-count')).toHaveTextContent(`2/${SECOND_BRAIN_FACT_LIMIT}`);

      await press('second-brain-fact-edit-f3');
      expect(screen.getByTestId('second-brain-fact-input').props.value).toBe('Two kids');
      await type('second-brain-fact-input', 'Two kids and a dog');
      await press('second-brain-fact-save');

      expect(mocked.editFact).toHaveBeenCalledWith('f3', { kind: 'ABOUT', text: 'Two kids and a dog' }, expect.anything());
      expect(within(within(about).getByTestId('second-brain-fact')).getByText('Two kids and a dog')).toBeTruthy();

      await press('second-brain-fact-delete-f3');

      expect(mocked.deleteFact).toHaveBeenCalledWith('f3', expect.anything());
      expect(screen.queryByText('Two kids and a dog')).toBeNull();
      expect(within(about).getByText('Nothing here yet.')).toBeTruthy();
    });

    it('leaves the line as it was when the edit is cancelled', async () => {
      mockLoad(overview());
      await renderScreen();

      await press('second-brain-fact-edit-f1');
      await type('second-brain-fact-input', 'Something else');
      await press('second-brain-fact-cancel');

      expect(screen.getByText('Cooking on Sundays')).toBeTruthy();
      expect(mocked.editFact).not.toHaveBeenCalled();
    });

    it('stops offering new lines once the profile is full, and says why', async () => {
      const lines = Array.from({ length: SECOND_BRAIN_FACT_LIMIT }, (_, index) => fact(`f${index}`, 'ABOUT', `Line ${index}`));
      mockLoad(overview({ facts: lines }));
      await renderScreen();

      expect(screen.getByTestId('second-brain-fact-count')).toHaveTextContent(
        `${SECOND_BRAIN_FACT_LIMIT}/${SECOND_BRAIN_FACT_LIMIT}`,
      );
      expect(screen.getByTestId('second-brain-fact-limit')).toHaveTextContent(
        'Your profile is full at 20 lines. Remove one to add another.',
      );
      expect(screen.queryByTestId('second-brain-fact-add-ABOUT')).toBeNull();
      expect(screen.queryByTestId('second-brain-fact-add-OBJECTIVE')).toBeNull();
    });
  });

  describe('loading and coming back', () => {
    it('offers a way back when the page cannot load', async () => {
      mocked.get.mockResolvedValue({ error: { message: 'boom' } });
      await renderScreen();

      const failure = screen.getByTestId('second-brain-error');
      expect(within(failure).getByText("We couldn't load your Second Brain.")).toBeTruthy();
      expect(within(failure).getByText('boom')).toBeTruthy();
      expect(screen.queryByTestId('second-brain-overview')).toBeNull();

      mockLoad(overview());
      await press('second-brain-retry');

      expect(screen.getByText('You kept most of the week.')).toBeTruthy();
      expect(screen.queryByTestId('second-brain-error')).toBeNull();
    });

    it('shows the shape of the page while the first read is in flight', async () => {
      let finish!: (value: unknown) => void;
      mocked.get.mockReturnValue(new Promise((resolve) => (finish = resolve)));
      mocked.refill.mockResolvedValue({ success: [] });
      await renderScreen();

      expect(screen.getByTestId('second-brain-skeleton')).toBeTruthy();

      await act(async () => {
        finish({ success: overview() });
      });

      expect(screen.queryByTestId('second-brain-skeleton')).toBeNull();
      expect(screen.getByTestId('second-brain-overview')).toBeTruthy();
    });

    /**
     * The web opens the page again on every navigation. The phone keeps the screen mounted
     * under whatever was pushed on top, so the return is where the day's first visit lands.
     */
    it('counts coming back to the screen as a visit', async () => {
      const yesterday = { text: 'Old read.', verdict: 'ON_COURSE', generatedAt: '2026-11-12T09:00:00Z', stale: true } as const;
      const today = { text: 'Today.', verdict: 'ON_COURSE', generatedAt: '2026-11-13T09:00:00Z', stale: false } as const;
      mockLoad(overview({ insight: yesterday }));
      mocked.write.mockResolvedValueOnce({ success: today });
      await renderScreen();
      await waitFor(() => expect(screen.getByText('Today.')).toBeTruthy());

      // The next morning, with the screen still mounted under whatever was on top of it.
      mocked.get.mockResolvedValue({ success: overview({ insight: { ...today, stale: true } }) });
      mocked.write.mockResolvedValueOnce({
        success: { text: 'A new day.', verdict: 'DRIFTING', generatedAt: '2026-11-14T07:00:00Z', stale: false },
      });
      await comeBack();

      await waitFor(() => expect(screen.getByText('A new day.')).toBeTruthy());
      expect(mocked.get).toHaveBeenCalledTimes(2);
      expect(mocked.write).toHaveBeenCalledTimes(2);
      // The questions were topped up within the hour, so that request is not repeated.
      expect(mocked.refill).toHaveBeenCalledTimes(1);
    });

    it('keeps the page and stays quiet when a refresh nobody asked for fails', async () => {
      mockLoad(overview());
      await renderScreen();

      mocked.get.mockResolvedValue({ error: { message: 'offline' } });
      await comeBack();

      expect(mocked.get).toHaveBeenCalledTimes(2);
      expect(mocked.toastError).not.toHaveBeenCalled();
      expect(screen.getByText('You kept most of the week.')).toBeTruthy();
      expect(screen.queryByTestId('second-brain-error')).toBeNull();
    });
  });
});

describe('new things and where lines come from', () => {
  /**
   * A habit created after the first visit gets its own question. The answer is why it
   * started, which becomes a note on the habit; where it lands is the server's call, so the
   * screen reads itself again.
   */
  it('asks about something new like any question, and reads the page again for the note it left', async () => {
    const newThing = question(
      'q7',
      'NEW_THING',
      'You started the habit "Gym". What led you to it, and what usually gets in the way?',
    );
    mockLoad(overview({ questions: [newThing] }));
    mocked.answer.mockResolvedValue({
      success: {
        question: { ...newThing, status: 'ANSWERED', answer: 'More energy. Rain stops me.' },
        learned: [],
        notes: [note('n9', 'More energy. Rain stops me.')],
      },
    });
    await renderScreen();

    expect(within(screen.getByTestId('second-brain-question')).getByText('Something new')).toBeTruthy();

    // What the server answers once the note is filed under the habit.
    mockLoad(overview({ questions: [], memory: memory() }));
    const readsBefore = mocked.get.mock.calls.length;
    await type('second-brain-answer-input', 'More energy. Rain stops me.');
    await press('second-brain-answer-send');

    const notes = screen.getByTestId('second-brain-answer-notes');
    expect(within(notes).getByText('Added to what Beyou remembers')).toBeTruthy();
    expect(screen.queryByText('Noted. Nothing new for your profile in that one.')).toBeNull();
    // Why a thing started is a note, not a request, so there is nothing to hand over.
    expect(screen.queryByTestId('second-brain-act')).toBeNull();
    await waitFor(() => expect(mocked.get.mock.calls.length).toBe(readsBefore + 1));
    expect(screen.getAllByTestId('second-brain-memory-group')).toHaveLength(2);
  });

  it('says which profile lines the assistant wrote, and says nothing of the ones typed', async () => {
    mockLoad(overview({ facts: [fact('f1', 'LIKE', 'Cooking on Sundays'), fact('f2', 'ABOUT', 'Has a daughter', 'ASSISTANT')] }));
    await renderScreen();

    expect(within(screen.getByTestId('second-brain-facts-ABOUT')).getByText('From the assistant')).toBeTruthy();
    expect(within(screen.getByTestId('second-brain-facts-LIKE')).queryByTestId('second-brain-fact-origin')).toBeNull();
  });
});

describe('what Beyou remembers', () => {
  it('groups the notes by category, each thing with its timeline and each note with where it came from', async () => {
    mockLoad(overview({ memory: memory() }));
    await renderScreen();

    const groups = screen.getAllByTestId('second-brain-memory-group');
    expect(groups).toHaveLength(2);
    expect(within(groups[0]).getAllByText('Health').length).toBeGreaterThan(0);
    expect(within(groups[1]).getByText('Routines and other notes')).toBeTruthy();

    const subjects = within(groups[0]).getAllByTestId('second-brain-memory-subject');
    expect(subjects).toHaveLength(3);
    expect(within(subjects[0]).getByText('Category')).toBeTruthy();
    expect(within(subjects[0]).getByText(/From the assistant/)).toBeTruthy();
    // Oldest first, as the server sends them.
    const gym = within(subjects[1]).getAllByTestId('second-brain-note');
    expect(within(gym[0]).getByText('Wants more energy for work')).toBeTruthy();
    expect(within(gym[1]).getByText('Rain is what stops it')).toBeTruthy();
    expect(within(gym[0]).getByText(/From an answer/)).toBeTruthy();
    // The habit is gone, and its name alone would not say so.
    expect(within(subjects[2]).getByTestId('second-brain-memory-deleted')).toHaveTextContent('Deleted habit');
    expect(within(subjects[1]).queryByTestId('second-brain-memory-deleted')).toBeNull();
    expect(within(groups[1]).getByText(/Written by you/)).toBeTruthy();
  });

  it('says where notes come from while there are none', async () => {
    mockLoad(overview());
    await renderScreen();

    expect(screen.getByTestId('second-brain-memory-empty')).toHaveTextContent(
      'Nothing yet. Notes show up here as you answer questions and talk to the assistant.',
    );
  });

  /** An edit keeps where the note came from. The screen shows what the server says. */
  it('edits a note in place and shows the origin the server kept', async () => {
    mockLoad(overview({ memory: memory() }));
    mocked.editNote.mockResolvedValue({ success: note('n3', 'Rain and cold stop it', 'ASSISTANT') });
    await renderScreen();

    await press('second-brain-note-edit-n3');
    expect(screen.getByTestId('second-brain-note-input').props.value).toBe('Rain is what stops it');
    await type('second-brain-note-input', ' Rain and cold stop it ');
    await press('second-brain-note-save');

    expect(mocked.editNote).toHaveBeenCalledWith('n3', 'Rain and cold stop it', expect.anything());
    expect(screen.queryByTestId('second-brain-note-form')).toBeNull();
    const edited = screen.getAllByTestId('second-brain-note').find((row) => within(row).queryByText('Rain and cold stop it'));
    expect(edited).toBeTruthy();
    expect(within(edited!).getByText(/From the assistant/)).toBeTruthy();
  });

  it('deletes a note at once, and a thing left with no notes goes with it', async () => {
    mockLoad(overview({ memory: memory() }));
    mocked.deleteNote.mockResolvedValue({ success: true });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderScreen();

    await press('second-brain-note-delete-n4');

    expect(mocked.deleteNote).toHaveBeenCalledWith('n4', expect.anything());
    expect(screen.queryByText('Swimming')).toBeNull();
    expect(screen.getAllByTestId('second-brain-memory-subject')).toHaveLength(3);
    // Like a profile line: nothing asked in between.
    expect(alert).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it('reads the page again when the note was already gone', async () => {
    mockLoad(overview({ memory: memory() }));
    mocked.deleteNote.mockResolvedValue({ error: { errorKey: 'SECOND_BRAIN_NOTE_NOT_FOUND' } });
    await renderScreen();
    const readsBefore = mocked.get.mock.calls.length;

    await press('second-brain-note-delete-n2');

    expect(mocked.toastError).toHaveBeenCalledWith("We couldn't find that note. It may have been deleted.");
    await waitFor(() => expect(mocked.get.mock.calls.length).toBe(readsBefore + 1));
  });
});

describe("the assistant's old note", () => {
  it('is not shown once nothing is left of it', async () => {
    mockLoad(overview());
    await renderScreen();

    expect(screen.getByTestId('second-brain-memory')).toBeTruthy();
    expect(screen.queryByTestId('second-brain-old-note')).toBeNull();
  });

  it('keeps a line in the profile, sending it back exactly as it came', async () => {
    mockLoad(overview({ oldNote: ['Has two kids.', 'Likes tea.'] }));
    mocked.keepLine.mockResolvedValue({
      success: { lines: ['Likes tea.'], fact: fact('f9', 'ABOUT', 'Has two kids.', 'OLD_NOTE') },
    });
    await renderScreen();

    await act(async () => {
      await fireEvent.press(within(screen.getAllByTestId('second-brain-old-note-line')[0]).getByTestId('second-brain-old-note-keep'));
    });

    expect(mocked.keepLine).toHaveBeenCalledWith('Has two kids.', expect.anything());
    expect(screen.getAllByTestId('second-brain-old-note-line')).toHaveLength(1);
    const about = screen.getByTestId('second-brain-facts-ABOUT');
    expect(within(about).getByText('Has two kids.')).toBeTruthy();
    expect(within(about).getByText("Kept from the assistant's old note")).toBeTruthy();
  });

  it('says the profile is full, in the block, and leaves the line where it was', async () => {
    mockLoad(overview({ oldNote: ['Has two kids.'] }));
    mocked.keepLine.mockResolvedValue({ error: { errorKey: 'SECOND_BRAIN_FACT_LIMIT_REACHED' } });
    await renderScreen();

    await press('second-brain-old-note-keep');

    expect(screen.getByTestId('second-brain-old-note-full')).toHaveTextContent(
      'Your profile is full at 20 lines. Remove one to add another.',
    );
    expect(screen.getByTestId('second-brain-old-note-line')).toHaveTextContent(/Has two kids\./);
    expect(mocked.toastError).not.toHaveBeenCalled();
  });

  it('drops a line, and the block goes once none is left', async () => {
    mockLoad(overview({ oldNote: ['Has two kids.'] }));
    mocked.discardLine.mockResolvedValue({ success: { lines: [], fact: null } });
    await renderScreen();

    await press('second-brain-old-note-discard');

    expect(mocked.discardLine).toHaveBeenCalledWith('Has two kids.', expect.anything());
    expect(screen.queryByTestId('second-brain-old-note')).toBeNull();
  });

  it('asks before deleting the whole note', async () => {
    mockLoad(overview({ oldNote: ['Has two kids.', 'Likes tea.'] }));
    mocked.clearOldNote.mockResolvedValue({ success: true });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderScreen();

    await press('second-brain-old-note-clear');

    expect(alert).toHaveBeenCalledTimes(1);
    const [title, body, buttons] = alert.mock.calls[0];
    expect(title).toBe('Delete the whole old note?');
    expect(body).toMatch(/move it to your profile first/);
    expect(mocked.clearOldNote).not.toHaveBeenCalled();

    const confirm = buttons?.find((button) => button.style === 'destructive');
    await act(async () => {
      confirm?.onPress?.();
    });

    expect(mocked.clearOldNote).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('second-brain-old-note')).toBeNull();
    alert.mockRestore();
  });
});

describe('useSecondBrain', () => {
  const stale = () => overview({ insight: { ...overview().insight, stale: true } });

  async function mountHook() {
    const view = await renderHook(() => useSecondBrain());
    await waitFor(() => expect(view.result.current.status).toBe('ready'));
    return view;
  }

  /** The timer keeps a screen current. Nobody arrived, so it earns no new model call. */
  it('does not count the refresh timer as a visit', async () => {
    mockLoad(stale());
    // The rewrite keeps failing, so the overview is still stale on every later read.
    mocked.write.mockResolvedValue({ error: { message: 'down' } });
    const { result } = await mountHook();
    await waitFor(() => expect(mocked.write).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.refresh('interval');
    });
    expect(mocked.get).toHaveBeenCalledTimes(2);
    expect(mocked.write).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refresh('dayChange');
    });
    expect(mocked.write).toHaveBeenCalledTimes(2);
  });

  /**
   * An empty list is always due, whatever the stamp says. Without the once-per-visit rule a
   * screen left open on "no questions" would ask the costly route again on every refresh.
   */
  it('asks for questions once per visit, however often the page is read again', async () => {
    mocked.get.mockResolvedValue({ success: overview({ questions: [] }) });
    mocked.refill.mockResolvedValue({ success: [] });
    const { result } = await mountHook();
    await waitFor(() => expect(mocked.refill).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.refilling).toBe(false));

    await act(async () => {
      await result.current.refresh('interval');
    });
    expect(mocked.get).toHaveBeenCalledTimes(2);
    expect(mocked.refill).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refresh('foreground');
    });
    expect(mocked.refill).toHaveBeenCalledTimes(2);
  });

  /** Both can take a model call's time, long enough to leave the screen and come back. */
  it('does not repeat a refill or a rewrite that is still out when the person comes back', async () => {
    mocked.get.mockResolvedValue({ success: stale() });
    mocked.refill.mockReturnValue(new Promise(() => {}));
    mocked.write.mockReturnValue(new Promise(() => {}));
    const { result } = await mountHook();
    await waitFor(() => expect(result.current.writing && result.current.refilling).toBe(true));

    await act(async () => {
      await result.current.refresh('foreground');
    });

    expect(mocked.refill).toHaveBeenCalledTimes(1);
    expect(mocked.write).toHaveBeenCalledTimes(1);
  });

  /**
   * A refresh that set off before a write and lands after it carries the page as it was
   * before the write. Painted as it comes, the skipped question would be back on screen.
   */
  it('reads again when a write lands while a read is in flight', async () => {
    const two = [question('q1', 'FOLLOW_UP', 'First?'), question('q2', 'FOLLOW_UP', 'Second?')];
    mockLoad(overview({ questions: two }));
    mocked.skip.mockResolvedValue({ success: { ...two[0], status: 'SKIPPED' } });
    const { result } = await mountHook();
    // Let the automatic refill land first: its answer is the question list too.
    await waitFor(() => expect(mocked.refill).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.refilling).toBe(false));

    let land!: (value: unknown) => void;
    mocked.get.mockReturnValueOnce(new Promise((resolve) => (land = resolve)));
    // Started and left in flight: the read's answer is held back until after the skip.
    let refreshing!: Promise<void>;
    await act(async () => {
      refreshing = result.current.refresh('interval');
    });
    await act(async () => {
      await result.current.skip('q1');
    });
    expect(result.current.overview?.questions.map((item) => item.id)).toEqual(['q2']);

    mocked.get.mockResolvedValue({ success: overview({ questions: [two[1]] }) });
    await act(async () => {
      land({ success: overview({ questions: two }) });
      await refreshing;
    });

    expect(mocked.get).toHaveBeenCalledTimes(3);
    expect(result.current.overview?.questions.map((item) => item.id)).toEqual(['q2']);
  });
});
