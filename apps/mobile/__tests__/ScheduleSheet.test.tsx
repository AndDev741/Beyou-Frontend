jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import ScheduleSheet from '../src/ui/routines/ScheduleSheet';

const routine = { id: 'r1', name: 'Morning', iconId: '', routineSections: [] } as never;
const wrap = (n: React.ReactElement) => render(<BeyouThemeProvider>{n}</BeyouThemeProvider>);

let post: jest.Mock;
beforeEach(() => {
  post = jest.fn(async () => ({ data: { success: true } }));
  const noop = async () => ({ data: null });
  setHttpClient({ get: noop, post, put: noop, delete: noop } as never);
  setLogger({ error: () => {} });
});

test('toggles days and POSTs createSchedule with the selected days', async () => {
  const onSaved = jest.fn();
  await wrap(<ScheduleSheet visible routine={routine} otherSchedules={[]} onClose={jest.fn()} onSaved={onSaved} />);
  await act(async () => { fireEvent.press(screen.getByTestId('day-Monday')); });
  await act(async () => { fireEvent.press(screen.getByTestId('day-Friday')); });
  await act(async () => { fireEvent.press(screen.getByTestId('schedule-save')); });
  await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
  const [url, body] = post.mock.calls[0];
  expect(url).toBe('/schedule');
  expect(body).toEqual({ routineId: 'r1', days: ['Monday', 'Friday'] });
  expect(onSaved).toHaveBeenCalled();
});

test('quick-group selects all weekdays', async () => {
  await wrap(<ScheduleSheet visible routine={routine} otherSchedules={[]} onClose={jest.fn()} onSaved={jest.fn()} />);
  await act(async () => { fireEvent.press(screen.getByTestId('group-weekdays')); });
  await act(async () => { fireEvent.press(screen.getByTestId('schedule-save')); });
  const [, body] = post.mock.calls[0];
  expect(body.days).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
});
