/**
 * The section inside the routine form, in the web's design: closed it shows only the
 * header (order arrows, name, times, favourite/edit/delete); the items arrive on
 * opening. The arrows must NOT need the card open: that is how the reorder got lost
 * once (the Notion card "Nao consigo re-ordenar secoes de uma rotina").
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

const wrap = async (props: ReturnType<typeof handlers>, count = 2) => {
  await act(async () => {
    render(
      <BeyouThemeProvider>
        <SectionCard
          section={section}
          index={0}
          count={count}
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
    fireEvent.press(screen.getByTestId('section-edit-0'));
  });
  expect(props.onEdit).toHaveBeenCalled();

  await act(async () => {
    fireEvent.press(screen.getByTestId('section-favorite-0'));
  });
  expect(props.onToggleFavorite).toHaveBeenCalled();

  await act(async () => {
    fireEvent.press(screen.getByTestId('section-remove-0'));
  });
  expect(props.onRemove).toHaveBeenCalled();
});

test('reorders from the closed header, without expanding', async () => {
  const props = handlers();
  await wrap(props);

  // First of two: up is disabled, down moves.
  await act(async () => {
    fireEvent.press(screen.getByTestId('section-up-0'));
  });
  expect(props.onMove).not.toHaveBeenCalled();
  expect(screen.getByTestId('section-up-0').props.accessibilityState.disabled).toBe(true);

  await act(async () => {
    fireEvent.press(screen.getByTestId('section-down-0'));
  });
  expect(props.onMove).toHaveBeenCalledWith(1);
  expect(screen.queryByText('Meditate')).toBeNull();
});

test('hides the order arrows when there is a single section', async () => {
  await wrap(handlers(), 1);
  expect(screen.queryByTestId('section-reorder-0')).toBeNull();
});

test('drops an item and opens the picker from inside the open section', async () => {
  const props = handlers();
  await wrap(props);
  await expand();

  await act(async () => {
    fireEvent.press(screen.getByTestId('section-item-remove-habit-h1'));
  });
  expect(props.onRemoveItem).toHaveBeenCalledWith(expect.objectContaining({ refId: 'h1' }));

  await act(async () => {
    fireEvent.press(screen.getByTestId('section-assign-0'));
  });
  expect(props.onAssign).toHaveBeenCalled();
});
