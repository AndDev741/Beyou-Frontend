/**
 * The section inside the routine form, in the web's design: closed it shows only the
 * header (name, times, favourite/edit/delete); the items and the order arrows arrive
 * on opening.
 */
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import SectionCard from '../src/ui/routines/SectionCard';

const section = {
  id: 's1',
  name: 'Wake',
  iconId: 'lucide:sun',
  startTime: '06:00',
  endTime: '07:00',
  order: 0,
  habitGroup: [{ habitId: 'h1', startTime: '06:10', endTime: '' }],
  taskGroup: [],
} as never;
const habits = [{ id: 'h1', name: 'Meditate', iconId: 'lucide:brain' }] as never[];
const tasks = [] as never[];

const handlers = () => ({
  onEdit: jest.fn(),
  onAssign: jest.fn(),
  onMove: jest.fn(),
  onRemove: jest.fn(),
  onRemoveItem: jest.fn(),
  onToggleFavorite: jest.fn(),
});

const wrap = async (props: ReturnType<typeof handlers>) => {
  await act(async () => {
    render(
      <BeyouThemeProvider>
        <SectionCard
          section={section}
          index={0}
          count={2}
          habits={habits}
          tasks={tasks}
          {...props}
        />
      </BeyouThemeProvider>,
    );
  });
};

const expand = async () => {
  await act(async () => {
    fireEvent.press(screen.getByTestId('section-toggle-0'));
  });
};

test('shows the header closed and the items only once expanded', async () => {
  const props = handlers();
  await wrap(props);

  expect(screen.getByText('Wake')).toBeTruthy();
  expect(screen.getByText('06:00')).toBeTruthy();
  expect(screen.getByText('07:00')).toBeTruthy();
  expect(screen.queryByText('Meditate')).toBeNull();

  await expand();
  expect(screen.getByText('Meditate')).toBeTruthy();
  expect(screen.getByText('06:10')).toBeTruthy();
});

test('fires edit, favorite and delete from the header', async () => {
  const props = handlers();
  await wrap(props);

  await act(async () => {
    fireEvent.press(screen.getByTestId('section-edit'));
  });
  expect(props.onEdit).toHaveBeenCalled();

  await act(async () => {
    fireEvent.press(screen.getByTestId('section-favorite-0'));
  });
  expect(props.onToggleFavorite).toHaveBeenCalled();

  await act(async () => {
    fireEvent.press(screen.getByTestId('section-remove'));
  });
  expect(props.onRemove).toHaveBeenCalled();
});

test('reorders and drops an item from inside the open section', async () => {
  const props = handlers();
  await wrap(props);
  await expand();

  await act(async () => {
    fireEvent.press(screen.getByTestId('section-down'));
  });
  expect(props.onMove).toHaveBeenCalledWith(1);

  await act(async () => {
    fireEvent.press(screen.getByTestId('section-item-remove-habit-h1'));
  });
  expect(props.onRemoveItem).toHaveBeenCalledWith(expect.objectContaining({ refId: 'h1' }));

  await act(async () => {
    fireEvent.press(screen.getByTestId('section-assign'));
  });
  expect(props.onAssign).toHaveBeenCalled();
});
