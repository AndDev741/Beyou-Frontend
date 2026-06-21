/** CategorySelector (P6-B2) — multi-select chips: toggle add/remove + reflects
 * initial selection. */
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import CategorySelector from '../src/ui/habits/CategorySelector';

const cats = [
  { id: 'c1', name: 'Health', iconId: 'lucide:heart' },
  { id: 'c2', name: 'Work', iconId: 'lucide:briefcase' },
] as never[];

const wrap = (node: React.ReactElement) =>
  render(<BeyouThemeProvider>{node}</BeyouThemeProvider>);

describe('CategorySelector', () => {
  it('reflects the initial selection and toggles', async () => {
    const onChange = jest.fn();
    await wrap(<CategorySelector categories={cats} value={['c1']} onChange={onChange} />);

    // Selecting an unselected chip adds it.
    await act(async () => {
      fireEvent.press(screen.getByTestId('category-c2'));
    });
    expect(onChange).toHaveBeenCalledWith(['c1', 'c2']);

    // Pressing an already-selected chip removes it.
    onChange.mockClear();
    await act(async () => {
      fireEvent.press(screen.getByTestId('category-c1'));
    });
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('shows an empty hint with no categories', async () => {
    await wrap(<CategorySelector categories={[]} value={[]} onChange={jest.fn()} />);
    expect(screen.getByText('No categories yet')).toBeTruthy();
  });
});
