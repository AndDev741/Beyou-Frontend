import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import ItemPickerSheet from '../src/ui/routines/ItemPickerSheet';

const section = { id: 's1', name: 'Wake', iconId: '', startTime: '06:00', endTime: '07:00', order: 0, habitGroup: [], taskGroup: [] } as never;
const habits = [{ id: 'h1', name: 'Meditate', iconId: 'lucide:brain' }] as never[];
const tasks = [{ id: 't1', name: 'Email', iconId: 'lucide:mail' }] as never[];
const wrap = (n: React.ReactElement) => render(<BeyouThemeProvider>{n}</BeyouThemeProvider>);

test('toggles a habit into the section and emits it', async () => {
  const onSave = jest.fn();
  await wrap(<ItemPickerSheet visible section={section} habits={habits} tasks={tasks} onSave={onSave} onClose={jest.fn()} />);
  await act(async () => { fireEvent.press(screen.getByTestId('item-habit-h1')); });
  await act(async () => { fireEvent.press(screen.getByTestId('items-save')); });
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
    habitGroup: [expect.objectContaining({ habitId: 'h1', startTime: '06:00' })],
  }));
});
