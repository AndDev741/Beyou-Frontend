jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { enterHabits } from '@beyou/state/habit/habitsSlice';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import ItemPickerSheet from '../src/ui/routines/ItemPickerSheet';
import RoutineBuilder from '../src/ui/routines/RoutineBuilder';
import RoutineCard from '../src/ui/routines/RoutineCard';

const habits = [
  { id: 'h1', name: 'Clean the tank', iconId: 'lucide:fish' },
  { id: 'h2', name: 'Meditate', iconId: 'lucide:brain' },
] as never[];

const wrap = (n: React.ReactElement, store = makeStore()) =>
  render(<Provider store={store}><BeyouThemeProvider>{n}</BeyouThemeProvider></Provider>);

beforeEach(() => {
  const noop = async () => ({ data: null });
  setHttpClient({ get: noop, post: noop, put: noop, delete: noop } as never);
  setLogger({ error: () => {} });
});

describe('picker tray', () => {
  const section = {
    id: 's1', name: 'Morning', iconId: '', startTime: '08:00', endTime: '10:00', order: 0,
    habitGroup: [{ id: 'g1', habitId: 'h1', startTime: '08:00', endTime: '08:30' }], taskGroup: [],
  } as never;

  test('an item follows the routine until a day is picked, then saves with it', async () => {
    const onSave = jest.fn();
    await wrap(<ItemPickerSheet visible section={section} habits={habits} tasks={[]} onSave={onSave} onClose={jest.fn()} />);

    expect(screen.getByText('Every day of the routine')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByLabelText('Days for Clean the tank')); });
    await act(async () => { fireEvent.press(screen.getByTestId('tray-habit-h1-days-day-Saturday')); });
    expect(screen.getByTestId('tray-habit-h1-days-day-Saturday').props.accessibilityState.selected).toBe(true);

    await act(async () => { fireEvent.press(screen.getByTestId('items-save')); });

    expect(onSave.mock.calls[0][0].habitGroup[0]).toEqual(expect.objectContaining({ habitId: 'h1', days: ['Saturday'] }));
  });

  test('warns when the days never meet the routine schedule', async () => {
    await wrap(
      <ItemPickerSheet visible section={section} habits={habits} tasks={[]} onSave={jest.fn()} onClose={jest.fn()} scheduleDays={['Saturday', 'Sunday']} />,
    );

    await act(async () => { fireEvent.press(screen.getByTestId('tray-habit-h1-days-toggle')); });
    await act(async () => { fireEvent.press(screen.getByTestId('tray-habit-h1-days-day-Monday')); });

    expect(screen.getByTestId('tray-habit-h1-days-miss')).toBeTruthy();
  });
});

test('the builder keeps an item days through its deep clone and sends them on save', async () => {
  const put: jest.Mock = jest.fn(async () => ({ data: { success: true } }));
  setHttpClient({ get: async () => ({ data: null }), post: jest.fn(), put, delete: async () => ({ data: null }) } as never);
  const routine = {
    id: 'r1', name: 'Weekend', iconId: '', type: 'DAILY',
    schedule: { id: 'sc', days: ['Saturday', 'Sunday'], routine: {} },
    routineSections: [{
      id: 's1', name: 'Morning', iconId: '', startTime: '08:00', endTime: '10:00', order: 0, taskGroup: [],
      habitGroup: [
        { id: 'g1', habitId: 'h1', startTime: '08:00', endTime: '08:30', days: ['Saturday'] },
        { id: 'g2', habitId: 'h2', startTime: '08:30', endTime: '09:00' },
      ],
    }],
  } as never;
  await wrap(<RoutineBuilder visible mode="edit" routine={routine} habits={habits} tasks={[]} onClose={jest.fn()} onSaved={jest.fn()} />);

  await act(async () => { fireEvent.press(screen.getByTestId('routine-save')); });

  await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
  const body = put.mock.calls[0][1];
  expect(body.routineSections[0].habitGroup[0].days).toEqual(['Saturday']);
  // Never had the field: it stays off the wire so the server keeps whatever it stored.
  expect('days' in body.routineSections[0].habitGroup[1]).toBe(false);
});

test('a list row sets its own days in the builder', async () => {
  const put: jest.Mock = jest.fn(async () => ({ data: { success: true } }));
  setHttpClient({ get: async () => ({ data: null }), post: jest.fn(), put, delete: async () => ({ data: null }) } as never);
  const routine = {
    id: 'r2', name: 'Errands', iconId: '', type: 'LIST', routineSections: [],
    items: [{ id: 'i1', type: 'HABIT', habitId: 'h1', taskId: null, orderIndex: 0 }],
  } as never;
  await wrap(<RoutineBuilder visible mode="edit" routine={routine} habits={habits} tasks={[]} onClose={jest.fn()} onSaved={jest.fn()} />);

  await act(async () => { fireEvent.press(screen.getByTestId('list-days-h1-toggle')); });
  await act(async () => { fireEvent.press(screen.getByTestId('list-days-h1-day-Sunday')); });
  await act(async () => { fireEvent.press(screen.getByTestId('routine-save')); });

  await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
  expect(put.mock.calls[0][1].items[0].days).toEqual(['Sunday']);
});

describe('routine card', () => {
  // 2026-11-06 is a Friday, 2026-11-07 a Saturday.
  const routine = {
    id: 'r1', name: 'Weekend', iconId: '', level: 1, xp: 0, actualLevelXp: 0, nextLevelXp: 100,
    routineSections: [{
      id: 's1', name: 'Morning', iconId: '', startTime: '08:00', endTime: '10:00', order: 0, taskGroup: [],
      habitGroup: [
        { id: 'g1', habitId: 'h1', startTime: '08:00', endTime: '08:30', habitGroupChecks: [], days: ['Saturday'] },
        { id: 'g2', habitId: 'h2', startTime: '08:30', endTime: '09:00', habitGroupChecks: [] },
      ],
    }],
  } as never;

  const renderCard = async (today: string) => {
    const store = makeStore();
    store.dispatch(enterHabits(habits as never));
    await wrap(
      <RoutineCard routine={routine} today={today} onSchedule={jest.fn()} onEdit={jest.fn()} onDelete={jest.fn()} onChanged={jest.fn()} />,
      store,
    );
    await act(async () => { fireEvent.press(screen.getByTestId('routine-card-r1')); });
  };

  test('an item off today is dimmed with its days, has no ring or skip, and leaves the tally', async () => {
    await renderCard('2026-11-06');

    const off = screen.getByTestId('routine-item-off-g1');
    expect(off.props.className).toContain('opacity-60');
    expect(screen.getByTestId('routine-item-days-g1')).toBeTruthy();
    expect(screen.getByText('Sat')).toBeTruthy();
    expect(screen.queryByTestId('routine-check-g1')).toBeNull();
    expect(screen.queryByTestId('routine-skip-g1')).toBeNull();
    expect(screen.getByTestId('routine-check-g2')).toBeTruthy();
    // Two items in the routine, one of them today.
    expect(screen.getByText('today 0/1')).toBeTruthy();
  });

  test('on its day the item is an ordinary checkable row', async () => {
    await renderCard('2026-11-07');

    expect(screen.queryByTestId('routine-item-off-g1')).toBeNull();
    expect(screen.getByTestId('routine-check-g1')).toBeTruthy();
    expect(screen.getByText('today 0/2')).toBeTruthy();
  });
});
