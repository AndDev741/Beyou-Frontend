/**
 * HabitCard — mirror of the web's habitBox. Edit and delete are ALWAYS
 * visible at the top (the web reveals them on hover, which does not exist here);
 * expanding releases the clamp and shows routines, phrase, attributes and the
 * numbers.
 */
jest.mock('@beyou/api/checkHistory/getCheckHistory', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import getCheckHistory from '@beyou/api/checkHistory/getCheckHistory';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import HabitCard from '../src/ui/habits/HabitCard';

const habit = {
  id: 'h1',
  name: 'Read',
  description: 'a long description',
  motivationalPhrase: 'keep growing',
  iconId: 'lucide:book',
  categories: [{ id: 'c1', name: 'Health', iconId: 'lucide:heart' }],
  importance: 3,
  dificulty: 2,
  xp: 50,
  level: 2,
  actualLevelXp: 0,
  nextLevelXp: 100,
  currentStreak: 4,
  bestStreak: 9,
  totalCheckIns: 32,
  firstCheckInDate: '2026-06-12',
  streakDormant: false,
  routines: { r1: 'Morning Routine' },
} as never;

const history = (outcomes: string[]) => ({
  success: {
    ownerType: 'HABIT',
    ownerId: 'h1',
    from: '2026-07-31',
    to: '2026-08-13',
    days: outcomes.map((outcome, index) => ({
      day: `2026-08-${String(index + 1).padStart(2, '0')}`,
      outcome,
    })),
  },
});

// Inside `act`: the theme provider settles after the first render, and a loose
// update would corrupt the next test in the file (see AGENTS.md).
const wrap = async (node: React.ReactElement) => {
  await act(async () => {
    render(
      <Provider store={makeStore()}>
        <BeyouThemeProvider>{node}</BeyouThemeProvider>
      </Provider>,
    );
  });
};

beforeEach(() => {
  (getCheckHistory as jest.Mock).mockReset();
  (getCheckHistory as jest.Mock).mockResolvedValue(history(['DONE', 'MISSED', 'DONE']));
});

describe('HabitCard', () => {
  it('keeps edit and delete reachable without expanding', async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    await wrap(<HabitCard habit={habit} onEdit={onEdit} onDelete={onDelete} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('habit-edit-h1'));
      fireEvent.press(screen.getByTestId('habit-delete-h1'));
    });

    expect(onEdit).toHaveBeenCalledWith(habit);
    expect(onDelete).toHaveBeenCalledWith(habit);
  });

  it('hides the details until it is expanded', async () => {
    await wrap(<HabitCard habit={habit} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.queryByText('keep growing')).toBeNull();
    expect(screen.queryByText('Morning Routine')).toBeNull();
    // The category stays on the closed card — it is what tells habits apart.
    expect(screen.getByText('Health')).toBeTruthy();
  });

  it('expands into routines, phrase and labelled attributes', async () => {
    await wrap(<HabitCard habit={habit} onEdit={jest.fn()} onDelete={jest.fn()} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('habit-card-h1'));
    });

    expect(screen.getByText('keep growing')).toBeTruthy();
    expect(screen.getByText('Morning Routine')).toBeTruthy();
    // The label rides with the value: "Medium" alone does not say which scale.
    expect(screen.getByText('Importance')).toBeTruthy();
    expect(screen.getByText('High')).toBeTruthy();
    expect(screen.getByText('Difficulty')).toBeTruthy();
    expect(screen.getByText('Normal')).toBeTruthy();
  });

  it('shows the streak, the record and the check-in total on the expanded card', async () => {
    await wrap(<HabitCard habit={habit} onEdit={jest.fn()} onDelete={jest.fn()} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('habit-card-h1'));
    });

    expect(screen.getByText('4 days')).toBeTruthy();
    expect(screen.getByText('best: 9')).toBeTruthy();
    expect(screen.getByText('32')).toBeTruthy();
    expect(screen.getByText(/since/)).toBeTruthy();
  });

  it('says "day" in the singular for a one-day run', async () => {
    await wrap(
      <HabitCard
        habit={{ ...(habit as object), currentStreak: 1 } as never}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('habit-card-h1'));
    });

    expect(screen.getByText('1 day')).toBeTruthy();
  });

  it('asks for the fortnight only once the card is open', async () => {
    await wrap(<HabitCard habit={habit} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(getCheckHistory).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.press(screen.getByTestId('habit-card-h1'));
    });

    expect(getCheckHistory).toHaveBeenCalledWith(
      expect.objectContaining({ ownerType: 'HABIT', ownerId: 'h1' }),
      expect.anything(),
      expect.any(Number),
    );
    // The squares need a measured width before they have a size at all.
    const strip = screen.getByTestId('check-strip-h1');
    await act(async () => {
      fireEvent(strip, 'layout', { nativeEvent: { layout: { width: 300, height: 20 } } });
    });
    expect(screen.getByTestId('check-cell-2026-08-02').props.accessibilityLabel).toContain('Missed');
  });

  it('drops the flame and labels a dormant run instead of resetting it', async () => {
    await wrap(
      <HabitCard
        habit={{ ...(habit as object), streakDormant: true } as never}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('habit-card-h1'));
    });

    // The number survives — the run is paused, not broken.
    expect(screen.getByText('4 days')).toBeTruthy();
    expect(screen.getByText('paused')).toBeTruthy();
    expect(screen.queryByText('best: 9')).toBeNull();
  });

  it('collapses again from the chevron', async () => {
    await wrap(<HabitCard habit={habit} onEdit={jest.fn()} onDelete={jest.fn()} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('habit-expand-h1'));
    });
    expect(screen.getByText('keep growing')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('habit-expand-h1'));
    });
    expect(screen.queryByText('keep growing')).toBeNull();
  });
});
