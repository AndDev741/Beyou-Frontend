import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import SectionCard from '../src/ui/routines/SectionCard';

const section = { id: 's1', name: 'Wake', iconId: 'lucide:sun', startTime: '06:00', endTime: '07:00', order: 0, habitGroup: [{ habitId: 'h1', startTime: '06:10', endTime: '' }], taskGroup: [] } as never;
const habits = [{ id: 'h1', name: 'Meditate', iconId: 'lucide:brain' }] as never[];
const tasks = [] as never[];
const wrap = (n: React.ReactElement) => render(<BeyouThemeProvider>{n}</BeyouThemeProvider>);

test('renders the section, its assigned items, and fires actions', async () => {
  const onEdit = jest.fn(), onAssign = jest.fn(), onMove = jest.fn(), onRemove = jest.fn();
  await wrap(<SectionCard section={section} index={0} count={2} habits={habits} tasks={tasks} onEdit={onEdit} onAssign={onAssign} onMove={onMove} onRemove={onRemove} />);
  expect(screen.getByText('Wake')).toBeTruthy();
  // Assigned habit shows under the section with its time.
  expect(screen.getByText('Meditate')).toBeTruthy();
  expect(screen.getByText('06:10')).toBeTruthy();
  await act(async () => {
    fireEvent.press(screen.getByTestId('section-edit'));
  });
  expect(onEdit).toHaveBeenCalled();
  await act(async () => {
    fireEvent.press(screen.getByTestId('section-down'));
  });
  expect(onMove).toHaveBeenCalledWith(1);
});
