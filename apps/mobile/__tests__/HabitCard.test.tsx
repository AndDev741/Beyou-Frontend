/**
 * HabitCard (P6-B1) — collapsed shows name/desc/level; tapping expands to reveal
 * the motivational phrase + importance/difficulty + Edit/Delete, which fire their
 * callbacks. Viewing details never requires the edit form.
 */
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
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
  constance: 4,
  routines: { r1: 'Morning Routine' },
} as never;

const wrap = (node: React.ReactElement) =>
  render(<BeyouThemeProvider>{node}</BeyouThemeProvider>);

describe('HabitCard', () => {
  it('expands to show details + fires edit/delete callbacks', async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    await wrap(<HabitCard habit={habit} onEdit={onEdit} onDelete={onDelete} />);

    // Collapsed: no phrase / edit / delete yet.
    expect(screen.queryByTestId('habit-edit-h1')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByTestId('habit-card-h1'));
    });

    // Expanded: phrase + importance phrase (High) + difficulty phrase (Normal) visible.
    expect(screen.getByText('"keep growing"')).toBeTruthy();
    expect(screen.getByText('High')).toBeTruthy(); // importance 3
    expect(screen.getByText('Normal')).toBeTruthy(); // dificulty 2
    expect(screen.getByText('Morning Routine')).toBeTruthy(); // "Using in" routine

    fireEvent.press(screen.getByTestId('habit-edit-h1'));
    expect(onEdit).toHaveBeenCalledWith(habit);

    fireEvent.press(screen.getByTestId('habit-delete-h1'));
    expect(onDelete).toHaveBeenCalledWith(habit);
  });
});
