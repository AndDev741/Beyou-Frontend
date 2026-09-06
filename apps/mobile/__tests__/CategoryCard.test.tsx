/**
 * CategoryCard — the mockup's compact card. Closed it shows icon, name, actions,
 * description and the XP bar; expanding reveals where the category is used. Edit and
 * delete live at the top (on the web they appear on hover; here, always).
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
  habits: { h1: 'Read' },
} as never;

// Inside `act`: the theme provider settles after the first render, and a loose
// update would corrupt the next test in the file (see AGENTS.md).
const wrap = async (node: React.ReactElement) => {
  await act(async () => {
    render(<BeyouThemeProvider>{node}</BeyouThemeProvider>);
  });
};

describe('CategoryCard', () => {
  it('shows the level line without expanding', async () => {
    await wrap(<CategoryCard category={category} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText('Health')).toBeTruthy();
    expect(screen.getByText('LV 2')).toBeTruthy();
    expect(screen.getByText('50/100')).toBeTruthy();
  });

  it('reveals where the category is used only once expanded', async () => {
    await wrap(<CategoryCard category={category} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.queryByText('Read')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByTestId('category-expand-cat1'));
    });

    expect(screen.getByText('Using in')).toBeTruthy();
    expect(screen.getByText('Read')).toBeTruthy();
  });

  it('says what to do when the category is used nowhere', async () => {
    await wrap(
      <CategoryCard
        category={{ ...(category as object), habits: undefined } as never}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('category-expand-cat1'));
    });

    expect(screen.getByText('Add this category in a habit, task or goal!')).toBeTruthy();
  });

  it('fires edit and delete from the top row', async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    await wrap(<CategoryCard category={category} onEdit={onEdit} onDelete={onDelete} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('category-edit-cat1'));
      fireEvent.press(screen.getByTestId('category-delete-cat1'));
    });

    expect(onEdit).toHaveBeenCalledWith(category);
    expect(onDelete).toHaveBeenCalledWith(category);
  });

  /**
   * The week beside the level, as on the web: the bars wait behind the chevron (twelve
   * open charts turned the list into a wall), the week's total does not.
   */
  it('draws the week of XP only once expanded, and its total always', async () => {
    await wrap(
      <CategoryCard
        category={category}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        xpSeries={[1, 2, 3, 4, 5, 6, 7]}
        xpDays={['2026-08-09', '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15']}
      />,
    );

    expect(screen.getByTestId('category-week-xp-cat1').props.children.join('')).toBe('+28');
    expect(screen.queryByTestId('category-sparkline-cat1')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByTestId('category-expand-cat1'));
    });

    expect(screen.getByTestId('category-sparkline-cat1')).toBeTruthy();
    expect(screen.getAllByTestId('xp-bar')).toHaveLength(7);
  });

  it('shows no week total when the week earned nothing', async () => {
    await wrap(
      <CategoryCard category={category} onEdit={jest.fn()} onDelete={jest.fn()} xpSeries={[0, 0, 0]} />,
    );
    expect(screen.queryByTestId('category-week-xp-cat1')).toBeNull();
  });
});
