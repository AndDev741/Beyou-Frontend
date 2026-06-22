jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import { enterRoutines } from '@beyou/state/routine/routinesSlice';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import ScheduleSheet from '../src/ui/routines/ScheduleSheet';

const routine = { id: 'r1', name: 'Morning', iconId: '', routineSections: [] } as never;

// Conflicts come from the routines slice (each routine's schedule.days), like web.
function renderSheet(sliceRoutines: unknown[] = [routine]) {
  const store = makeStore();
  store.dispatch(enterRoutines(sliceRoutines as never));
  return render(
    <Provider store={store}>
      <BeyouThemeProvider>
        <ScheduleSheet visible routine={routine} onClose={jest.fn()} onSaved={jest.fn()} />
      </BeyouThemeProvider>
    </Provider>,
  );
}

let post: jest.Mock;
beforeEach(() => {
  post = jest.fn(async () => ({ data: { success: true } }));
  const noop = async () => ({ data: null });
  setHttpClient({ get: noop, post, put: noop, delete: noop } as never);
  setLogger({ error: () => {} });
});

test('toggles days and POSTs createSchedule with the selected days', async () => {
  await renderSheet();
  await act(async () => { fireEvent.press(screen.getByTestId('day-Monday')); });
  await act(async () => { fireEvent.press(screen.getByTestId('day-Friday')); });
  await act(async () => { fireEvent.press(screen.getByTestId('schedule-save')); });
  await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
  const [url, body] = post.mock.calls[0];
  expect(url).toBe('/schedule');
  expect(body).toEqual({ routineId: 'r1', days: ['Monday', 'Friday'] });
});

test('quick-group selects all weekdays', async () => {
  await renderSheet();
  await act(async () => { fireEvent.press(screen.getByTestId('group-weekdays')); });
  await act(async () => { fireEvent.press(screen.getByTestId('schedule-save')); });
  const [, body] = post.mock.calls[0];
  expect(body.days).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
});

test('a day owned by another routine is blocked until override is confirmed', async () => {
  // Another routine in the slice owns Monday.
  await renderSheet([
    routine,
    { id: 'r2', name: 'Evening', iconId: '', routineSections: [], schedule: { id: 'sc2', days: ['Monday'], routine: {} } },
  ]);

  const alertSpy = jest.spyOn(Alert, 'alert');
  await act(async () => { fireEvent.press(screen.getByTestId('day-Monday')); });
  expect(alertSpy).toHaveBeenCalled();
  expect(screen.getByTestId('day-Monday').props.accessibilityState.selected).toBe(false);

  // Confirm the override → Monday becomes selected and POSTs.
  alertSpy.mockImplementation((_t, _m, buttons) => { (buttons ?? []).find((b) => b.style !== 'cancel')?.onPress?.(); });
  await act(async () => { fireEvent.press(screen.getByTestId('day-Monday')); });
  expect(screen.getByTestId('day-Monday').props.accessibilityState.selected).toBe(true);

  await act(async () => { fireEvent.press(screen.getByTestId('schedule-save')); });
  await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
  expect(post.mock.calls[0][1].days).toEqual(['Monday']);
  alertSpy.mockRestore();
});
