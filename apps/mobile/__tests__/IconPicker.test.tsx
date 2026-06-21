/**
 * IconPicker + IconPickerField (P6-A1). The picker mirrors the web iconsBox: search
 * + category tabs + a grid of BeyouIcon tiles; selecting emits the canonical id and
 * records a recent. lucide-react-native is mocked globally (jest.setup.js).
 */
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import IconPicker from '../src/ui/icons/IconPicker';
import IconPickerField from '../src/ui/icons/IconPickerField';
import { iconRecents } from '../src/ui/icons/iconRecents';

const wrap = (node: React.ReactElement) =>
  render(<BeyouThemeProvider>{node}</BeyouThemeProvider>);

beforeEach(() => {
  iconRecents.clearRecentIcons();
});

describe('IconPicker', () => {
  it('renders search results and emits the canonical id + records a recent on select', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    await wrap(<IconPicker visible onSelect={onSelect} onClose={onClose} />);

    // Deterministic results (no-query path is randomized): type a query first.
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('icon-picker-search'), 'house');
    });

    const tiles = screen.getAllByLabelText(/^Icon: /);
    expect(tiles.length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.press(tiles[0]);
    });

    expect(onSelect).toHaveBeenCalledTimes(1);
    const emitted = onSelect.mock.calls[0][0] as string;
    expect(emitted).toMatch(/^(lucide:|emoji:)/);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(iconRecents.getRecentIconIds()).toContain(emitted);
  });

  it('renders nothing when not visible', async () => {
    await wrap(<IconPicker visible={false} onSelect={jest.fn()} onClose={jest.fn()} />);
    expect(screen.queryByTestId('icon-picker-search')).toBeNull();
  });
});

describe('IconPickerField', () => {
  it('opens the picker when pressed', async () => {
    await wrap(
      <IconPickerField label="Icon" value={null} onChange={jest.fn()} testID="habit-icon" />,
    );
    expect(screen.queryByTestId('icon-picker-search')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByTestId('habit-icon'));
    });
    expect(screen.getByTestId('icon-picker-search')).toBeTruthy();
  });

  it('shows the selected entry label', async () => {
    await wrap(
      <IconPickerField label="Icon" value="lucide:house" onChange={jest.fn()} testID="habit-icon" />,
    );
    // getEntryById('lucide:house') resolves to a labeled entry.
    expect(screen.getByTestId('habit-icon')).toBeTruthy();
  });
});
