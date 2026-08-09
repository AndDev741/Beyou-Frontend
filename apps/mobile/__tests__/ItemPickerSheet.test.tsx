jest.mock('../src/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import ItemPickerSheet from '../src/ui/routines/ItemPickerSheet';
import { iconRecents } from '../src/ui/icons/iconRecents';

const section = { id: 's1', name: 'Wake', iconId: '', startTime: '06:00', endTime: '07:00', order: 0, habitGroup: [], taskGroup: [] } as never;
const habits = [{ id: 'h1', name: 'Meditate', iconId: 'lucide:brain' }] as never[];
const tasks = [{ id: 't1', name: 'Email', iconId: 'lucide:mail' }] as never[];
const wrap = (n: React.ReactElement) =>
  render(<Provider store={makeStore()}><BeyouThemeProvider>{n}</BeyouThemeProvider></Provider>);

test('one tap assigns the habit, with a time suggested inside the section window', async () => {
  const onSave = jest.fn();
  await wrap(<ItemPickerSheet visible section={section} habits={habits} tasks={tasks} onSave={onSave} onClose={jest.fn()} />);
  await act(async () => { fireEvent.press(screen.getByTestId('item-habit-h1')); });
  // It leaves the list and enters the tray, with remove and both times.
  expect(screen.queryByTestId('item-habit-h1')).toBeNull();
  expect(screen.getByTestId('remove-habit-h1')).toBeTruthy();
  expect(screen.getByTestId('tray-habit-h1-start')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByTestId('items-save')); });
  // Section 06:00–07:00: a lone item takes the default 15 minute slice at the
  // start of the window — the rest stays free for the next ones.
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
    habitGroup: [expect.objectContaining({ habitId: 'h1', startTime: '06:00', endTime: '06:15' })],
  }));
});

/** The second item resumes where the first stopped, with no overlap. */
test('the next item resumes after the one already assigned', async () => {
  const onSave = jest.fn();
  const twoHabits = [...habits, { id: 'h2', name: 'Stretch', iconId: 'lucide:activity' }] as never[];
  await wrap(<ItemPickerSheet visible section={section} habits={twoHabits} tasks={tasks} onSave={onSave} onClose={jest.fn()} />);

  await act(async () => { fireEvent.press(screen.getByTestId('item-habit-h1')); });
  await act(async () => { fireEvent.press(screen.getByTestId('item-habit-h2')); });
  await act(async () => { fireEvent.press(screen.getByTestId('items-save')); });

  const saved = onSave.mock.calls[0][0];
  expect(saved.habitGroup[0]).toEqual(expect.objectContaining({ startTime: '06:00', endTime: '06:15' }));
  expect(saved.habitGroup[1]).toEqual(expect.objectContaining({ startTime: '06:15', endTime: '06:30' }));
});

test('Tasks tab lists tasks; assigning then removing clears the tray', async () => {
  const onSave = jest.fn();
  await wrap(<ItemPickerSheet visible section={section} habits={habits} tasks={tasks} onSave={onSave} onClose={jest.fn()} />);
  // Habits tab is default — the task isn't listed yet.
  expect(screen.queryByTestId('item-task-t1')).toBeNull();
  await act(async () => { fireEvent.press(screen.getByTestId('item-picker-kind-task')); });
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

  await act(async () => { fireEvent.press(screen.getByTestId('item-picker-kind-task')); });
  await act(async () => { fireEvent.press(screen.getByTestId('quick-create-task')); });

  // Fill the nested TaskForm.
  await act(async () => { fireEvent.changeText(screen.getByTestId('task-name'), 'Groceries'); });
  await act(async () => { fireEvent.press(screen.getByTestId('task-icon')); });
  await act(async () => { fireEvent.changeText(screen.getByTestId('icon-picker-search'), 'house'); });
  await act(async () => { fireEvent.press(screen.getAllByLabelText(/^Icon: /)[0]); });
  await act(async () => { fireEvent.press(screen.getByText('Low')); });
  await act(async () => { fireEvent.press(screen.getByText('Easy')); });
  await act(async () => { fireEvent.press(screen.getByTestId('task-form-submit')); });

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

/**
 * Regression guard for "the sheet opens empty": title and footer visible, the
 * whole middle gone.
 *
 * The BottomSheet panel is capped with `max-h`, not given a height, so it sizes
 * to its content. `flex: 1` on the scroll area means `flexBasis: 0`, so it
 * contributed nothing to that measurement — the panel closed around the title
 * and the footer, leaving the list at 0px.
 *
 * Be clear about what this can prove: jest runs no layout engine, so a
 * zero-height view still renders its children into the tree and every query
 * above keeps passing. That is exactly why the bug shipped with this file
 * already covering the sheet. Asserting the layout prop is the only mechanical
 * guard available here — the visual result needs a device.
 */
test('gives the scroll area a shrinkable height, not flexBasis 0', async () => {
  const { StyleSheet } = require('react-native');
  await wrap(
    <ItemPickerSheet visible section={section} habits={habits} tasks={tasks} onSave={jest.fn()} onClose={jest.fn()} />
  );

  const style = StyleSheet.flatten(screen.getByTestId('item-picker-scroll').props.style) ?? {};

  // flexBasis 0 is the defect: it hides the list from the panel's content-based
  // measurement, which is what collapsed the sheet to title + footer.
  expect(style.flexBasis).not.toBe(0);
  expect(style.flexShrink).toBe(1);
});

/** Search filters the active side's list. */
test('filters the available list by the search term', async () => {
  await wrap(<ItemPickerSheet visible section={section} habits={habits} tasks={tasks} onSave={jest.fn()} onClose={jest.fn()} />);

  await act(async () => {
    fireEvent.changeText(screen.getByTestId('item-picker-search'), 'zzz');
  });

  expect(screen.queryByTestId('item-habit-h1')).toBeNull();

  await act(async () => {
    fireEvent.changeText(screen.getByTestId('item-picker-search'), '');
  });

  expect(screen.getByTestId('item-habit-h1')).toBeTruthy();
});

test('keeps the tray when the kind changes', async () => {
  await wrap(<ItemPickerSheet visible section={section} habits={habits} tasks={tasks} onSave={jest.fn()} onClose={jest.fn()} />);

  await act(async () => {
    fireEvent.press(screen.getByTestId('item-habit-h1'));
  });
  expect(screen.getByTestId('remove-habit-h1')).toBeTruthy();

  // Switching tabs shows the other side; what is already assigned stays.
  await act(async () => {
    fireEvent.press(screen.getByTestId('item-picker-kind-task'));
  });

  expect(screen.getByTestId('remove-habit-h1')).toBeTruthy();
  expect(screen.getByTestId('item-task-t1')).toBeTruthy();
});
