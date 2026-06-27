jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import RoutineBuilder from '../src/ui/routines/RoutineBuilder';
import { notify } from '../src/notify';

const habits = [{ id: 'h1', name: 'Meditate', iconId: 'lucide:brain' }] as never[];
const wrap = (n: React.ReactElement) => render(<BeyouThemeProvider>{n}</BeyouThemeProvider>);

let post: jest.Mock;
beforeEach(() => {
  post = jest.fn(async () => ({ data: { success: true } }));
  const noop = async () => ({ data: null });
  setHttpClient({ get: noop, post, put: noop, delete: noop } as never);
  setLogger({ error: () => {} });
  (notify.error as jest.Mock).mockClear();
});

test('create starts on the type picker; only Daily is selectable', async () => {
  await wrap(<RoutineBuilder visible mode="create" habits={habits} tasks={[]} onClose={jest.fn()} onSaved={jest.fn()} />);
  // Picker shown, form hidden until a type is chosen.
  expect(screen.getByTestId('routine-type-daily')).toBeTruthy();
  expect(screen.queryByTestId('routine-name')).toBeNull();
  await act(async () => { fireEvent.press(screen.getByTestId('routine-type-daily')); });
  expect(screen.getByTestId('routine-name')).toBeTruthy();
});

test('blocks save with no name/sections', async () => {
  await wrap(<RoutineBuilder visible mode="create" habits={habits} tasks={[]} onClose={jest.fn()} onSaved={jest.fn()} />);
  await act(async () => { fireEvent.press(screen.getByTestId('routine-type-daily')); });
  await act(async () => { fireEvent.press(screen.getByTestId('routine-save')); });
  expect(post).not.toHaveBeenCalled();
  expect(notify.error).toHaveBeenCalled();
});

test('shows an inline, section-qualified error when an item time is outside the section', async () => {
  const routine = {
    id: 'r1', name: 'Morning', iconId: '', routineSections: [
      { id: 's1', name: 'Wake', iconId: '', startTime: '06:00', endTime: '07:00', order: 0,
        habitGroup: [{ id: 'g1', habitId: 'h1', startTime: '09:00', endTime: '' }], taskGroup: [] },
    ],
  } as never;
  await wrap(<RoutineBuilder visible mode="edit" routine={routine} habits={habits} tasks={[]} onClose={jest.fn()} onSaved={jest.fn()} />);
  await act(async () => { fireEvent.press(screen.getByTestId('routine-save')); });
  const err = screen.getByTestId('routine-form-error');
  expect(err).toBeTruthy();
  expect(err.props.children).toContain('Wake: ');
});

test('edit mode shows the in-form Adjust with AI button', async () => {
  const routine = { id: 'r1', name: 'Morning', iconId: '', routineSections: [
    { id: 's1', name: 'Wake', iconId: '', startTime: '06:00', endTime: '07:00', order: 0, habitGroup: [], taskGroup: [] },
  ] } as never;
  await wrap(<RoutineBuilder visible mode="edit" routine={routine} habits={habits} tasks={[]} onClose={jest.fn()} onSaved={jest.fn()} />);
  expect(screen.getByTestId('ai-routine')).toBeTruthy();
  expect(screen.getByText(/Adjust with AI/)).toBeTruthy();
});

test('posts a routine with a section', async () => {
  const onSaved = jest.fn();
  await wrap(<RoutineBuilder visible mode="create" habits={habits} tasks={[]} onClose={jest.fn()} onSaved={onSaved} />);
  await act(async () => { fireEvent.press(screen.getByTestId('routine-type-daily')); });
  await act(async () => { fireEvent.changeText(screen.getByTestId('routine-name'), 'Morning'); });

  // Add a section via the sheet.
  await act(async () => { fireEvent.press(screen.getByTestId('add-section')); });
  await act(async () => { fireEvent.changeText(screen.getByTestId('section-name'), 'Wake'); });
  await act(async () => { fireEvent.press(screen.getByTestId('section-start')); });
  const d = new Date(); d.setHours(6, 0, 0, 0);
  await act(async () => { fireEvent(screen.getByTestId('section-start-picker'), 'onChange', { type: 'set' }, d); });
  await act(async () => { fireEvent.press(screen.getByTestId('section-save')); });

  await act(async () => { fireEvent.press(screen.getByTestId('routine-save')); });

  await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
  const [url, body] = post.mock.calls[0];
  expect(url).toBe('/routine');
  expect(body.name).toBe('Morning');
  expect(body.routineSections[0]).toEqual(expect.objectContaining({ name: 'Wake', startTime: '06:00' }));
  expect(onSaved).toHaveBeenCalled();
}, 20000);
