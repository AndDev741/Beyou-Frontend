jest.mock('../src/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import ItemPickerSheet from '../src/ui/routines/ItemPickerSheet';
import { iconRecents } from '../src/ui/icons/iconRecents';

const section = { id: 's1', name: 'Wake', iconId: '', startTime: '06:00', endTime: '07:00', order: 0, habitGroup: [], taskGroup: [] } as never;
const habits = [{ id: 'h1', name: 'Meditate', iconId: 'lucide:brain' }] as never[];
const tasks = [{ id: 't1', name: 'Email', iconId: 'lucide:mail' }] as never[];
const wrap = (n: React.ReactElement) => render(<BeyouThemeProvider>{n}</BeyouThemeProvider>);

test('adds a habit to the tray with empty times and emits it', async () => {
  const onSave = jest.fn();
  await wrap(<ItemPickerSheet visible section={section} habits={habits} tasks={tasks} onSave={onSave} onClose={jest.fn()} />);
  await act(async () => { fireEvent.press(screen.getByTestId('item-habit-h1')); });
  // Once added it leaves the list and gains a tray remove + time fields.
  expect(screen.getByTestId('remove-habit-h1')).toBeTruthy();
  expect(screen.getByTestId('tray-habit-h1-start')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByTestId('items-save')); });
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
    habitGroup: [expect.objectContaining({ habitId: 'h1', startTime: '', endTime: '' })],
  }));
});

test('Tasks tab lists tasks; select then remove clears the tray', async () => {
  const onSave = jest.fn();
  await wrap(<ItemPickerSheet visible section={section} habits={habits} tasks={tasks} onSave={onSave} onClose={jest.fn()} />);
  // Habits tab is default — the task isn't listed yet.
  expect(screen.queryByTestId('item-task-t1')).toBeNull();
  await act(async () => { fireEvent.press(screen.getByTestId('tab-task')); });
  await act(async () => { fireEvent.press(screen.getByTestId('item-task-t1')); });
  expect(screen.getByTestId('remove-task-t1')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByTestId('remove-task-t1')); });
  await act(async () => { fireEvent.press(screen.getByTestId('items-save')); });
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ habitGroup: [], taskGroup: [] }));
});

test('quick-creates a task and auto-adds it to the tray', async () => {
  iconRecents.clearRecentIcons();
  const post = jest.fn(async () => ({ data: { success: true } }));
  // getCategories → []; getTasks refetch → includes the new task (matched by name).
  const get = jest.fn(async (url: string) =>
    String(url).includes('categor')
      ? { data: [] }
      : { data: [...tasks, { id: 't-new', name: 'Groceries', iconId: 'lucide:cart' }] },
  );
  setHttpClient({ get, post, put: async () => ({ data: null }), delete: async () => ({ data: null }) } as never);
  setLogger({ error: () => {} });

  const onSave = jest.fn();
  await wrap(<ItemPickerSheet visible section={section} habits={habits} tasks={tasks} onSave={onSave} onClose={jest.fn()} />);

  await act(async () => { fireEvent.press(screen.getByTestId('tab-task')); });
  await act(async () => { fireEvent.press(screen.getByTestId('quick-create-task')); });

  // Fill the nested TaskForm.
  await act(async () => { fireEvent.changeText(screen.getByTestId('task-name'), 'Groceries'); });
  await act(async () => { fireEvent.press(screen.getByTestId('task-icon')); });
  await act(async () => { fireEvent.changeText(screen.getByTestId('icon-picker-search'), 'house'); });
  await act(async () => { fireEvent.press(screen.getAllByLabelText(/^Icon: /)[0]); });
  await act(async () => { fireEvent.press(screen.getByText('Low')); });
  await act(async () => { fireEvent.press(screen.getByText('Easy')); });
  await act(async () => { fireEvent.press(screen.getByTestId('task-submit')); });

  await waitFor(() => expect(post).toHaveBeenCalledWith('/task', expect.anything()));
  // The created task is auto-added to the section tray.
  await waitFor(() => expect(screen.getByTestId('remove-task-t-new')).toBeTruthy());
}, 20000);

test('sets a start time on a tray item', async () => {
  const onSave = jest.fn();
  await wrap(<ItemPickerSheet visible section={section} habits={habits} tasks={tasks} onSave={onSave} onClose={jest.fn()} />);
  await act(async () => { fireEvent.press(screen.getByTestId('item-habit-h1')); });
  await act(async () => { fireEvent.press(screen.getByTestId('tray-habit-h1-start')); });
  const d = new Date(); d.setHours(6, 30, 0, 0);
  await act(async () => { fireEvent(screen.getByTestId('tray-habit-h1-start-picker'), 'onChange', { type: 'set' }, d); });
  await act(async () => { fireEvent.press(screen.getByTestId('items-save')); });
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
    habitGroup: [expect.objectContaining({ habitId: 'h1', startTime: '06:30' })],
  }));
});
