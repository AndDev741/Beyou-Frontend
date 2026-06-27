/**
 * CategoryCard — shows name/description + a level bar (categories carry xp/level);
 * tapping expands to reveal Edit/Delete, which fire their callbacks.
 */
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import CategoryCard from '../src/ui/categories/CategoryCard';

const category = {
  id: 'cat1',
  name: 'Health',
  description: 'a long description',
  iconId: 'lucide:heart',
  xp: 50,
  level: 2,
  actualLevelXp: 0,
  nextLevelXp: 100,
} as never;

const wrap = (node: React.ReactElement) => render(<BeyouThemeProvider>{node}</BeyouThemeProvider>);

describe('CategoryCard', () => {
  it('shows the level, expands, fires edit/delete', async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    await wrap(<CategoryCard category={category} onEdit={onEdit} onDelete={onDelete} />);

    expect(screen.getByText('Health')).toBeTruthy();
    expect(screen.getByText('Level 2')).toBeTruthy();
    // Collapsed: no edit/delete yet.
    expect(screen.queryByTestId('category-edit-cat1')).toBeNull();

    await act(async () => { fireEvent.press(screen.getByTestId('category-card-cat1')); });

    await act(async () => { fireEvent.press(screen.getByTestId('category-edit-cat1')); });
    expect(onEdit).toHaveBeenCalledWith(category);
    await act(async () => { fireEvent.press(screen.getByTestId('category-delete-cat1')); });
    expect(onDelete).toHaveBeenCalledWith(category);
  });
});
