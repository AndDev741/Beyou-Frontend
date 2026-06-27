/** CategorySelector (P6-B2) — multi-select chips: toggle add/remove + reflects
 * initial selection. Quick-create (feat/mobile-quick-create): "+ New" opens the
 * CategoryForm inline and auto-selects the created category after a refetch. */
jest.mock('../src/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import CategorySelector from '../src/ui/habits/CategorySelector';
import { iconRecents } from '../src/ui/icons/iconRecents';

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

  it('inline-creates a category and auto-selects it after refetch', async () => {
    iconRecents.clearRecentIcons();
    const post = jest.fn(async () => ({ data: { success: true } }));
    // getCategories returns response.data directly; refetch includes the new category.
    const get = jest.fn(async () => ({
      data: [...cats, { id: 'c-new', name: 'Fitness', iconId: 'lucide:dumbbell' }],
    }));
    setHttpClient({ get, post, put: async () => ({ data: null }), delete: async () => ({ data: null }) } as never);
    setLogger({ error: () => {} });

    const onChange = jest.fn();
    await wrap(<CategorySelector categories={cats} value={[]} onChange={onChange} />);

    // Open the inline CategoryForm.
    await act(async () => {
      fireEvent.press(screen.getByTestId('category-add-new'));
    });
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('category-name'), 'Fitness');
    });
    // Pick any icon through the picker.
    await act(async () => {
      fireEvent.press(screen.getByTestId('category-icon'));
    });
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('icon-picker-search'), 'house');
    });
    await act(async () => {
      fireEvent.press(screen.getAllByLabelText(/^Icon: /)[0]);
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('category-submit'));
    });

    await waitFor(() => expect(post).toHaveBeenCalledWith('/category', expect.anything()));
    // After the refetch lands, the new category renders as a chip AND is auto-selected.
    await waitFor(() => expect(screen.getByTestId('category-c-new')).toBeTruthy());
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['c-new']));
  }, 20000);
});
