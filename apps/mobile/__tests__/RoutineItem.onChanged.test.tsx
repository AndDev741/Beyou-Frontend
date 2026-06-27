jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import RoutineItem from '../src/ui/dashboard/RoutineItem';

beforeEach(() => {
  const ok = async () => ({ data: { success: {} } });
  setHttpClient({ get: ok, post: ok, put: ok, delete: ok } as never);
  setLogger({ error: () => {} });
});

test('calls onChanged after a check', async () => {
  const onChanged = jest.fn();
  const item = { type: 'habit', id: 'h1', groupId: 'g1', startTime: '06:00', check: [] } as never;
  await render(
    <Provider store={makeStore()}>
      <BeyouThemeProvider>
        <RoutineItem routineId="r1" item={item} name="Meditate" today="2026-06-22" onChanged={onChanged} />
      </BeyouThemeProvider>
    </Provider>,
  );
  await act(async () => { fireEvent.press(screen.getByTestId('routine-check-g1')); });
  await waitFor(() => expect(onChanged).toHaveBeenCalled());
});

test('optimistically shows checked without waiting for slice to update', async () => {
  const item = { type: 'habit', id: 'h1', groupId: 'g1', startTime: '06:00', check: [] } as never;
  await render(
    <Provider store={makeStore()}>
      <BeyouThemeProvider>
        <RoutineItem routineId="r1" item={item} name="Meditate" today="2026-06-22" onChanged={jest.fn()} />
      </BeyouThemeProvider>
    </Provider>,
  );
  expect(screen.getByTestId('routine-check-g1').props.accessibilityState.checked).toBe(false);
  await act(async () => { fireEvent.press(screen.getByTestId('routine-check-g1')); });
  // Server returned an empty RefreshUI (item.check stays []), but the optimistic override holds.
  expect(screen.getByTestId('routine-check-g1').props.accessibilityState.checked).toBe(true);
});
