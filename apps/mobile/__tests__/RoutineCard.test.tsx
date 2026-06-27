import { Provider } from 'react-redux';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import { makeStore } from '../src/store';
import { enterHabits } from '@beyou/state/habit/habitsSlice';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import RoutineCard from '../src/ui/routines/RoutineCard';

const routine = {
  id: 'r1', name: 'Morning', iconId: 'lucide:sun', level: 2, xp: 50, actualLevelXp: 0, nextLevelXp: 100,
  schedule: { id: 'sc1', days: ['Monday', 'Wednesday'], routine: {} },
  routineSections: [{
    id: 's1', name: 'Wake', iconId: 'lucide:sun', startTime: '06:00', endTime: '07:00', order: 0,
    habitGroup: [{ id: 'g1', habitId: 'h1', startTime: '06:10', habitGroupChecks: [] }], taskGroup: [],
  }],
} as never;

async function wrap() {
  const store = makeStore();
  store.dispatch(enterHabits([{ id: 'h1', name: 'Meditate', iconId: 'lucide:brain' }] as never));
  const props = { onSchedule: jest.fn(), onEdit: jest.fn(), onDelete: jest.fn(), onChanged: jest.fn() };
  const result = await render(
    <Provider store={store}><BeyouThemeProvider>
      <RoutineCard routine={routine} today="2026-06-22" {...props} />
    </BeyouThemeProvider></Provider>,
  );
  return { props, ...result };
}

test('shows stats + always-visible edit/delete/schedule; expands to sections', async () => {
  const { props } = await wrap();
  expect(screen.getByText('Morning')).toBeTruthy();
  // Edit / Delete / Schedule are all in the header — no need to expand & scroll.
  expect(screen.getByTestId('schedule-r1')).toBeTruthy();
  expect(screen.getByTestId('edit-r1')).toBeTruthy();
  expect(screen.getByTestId('delete-r1')).toBeTruthy();
  expect(screen.queryByText('Meditate')).toBeNull();       // section hidden until expanded

  fireEvent.press(screen.getByTestId('edit-r1'));
  expect(props.onEdit).toHaveBeenCalledWith(routine);
  fireEvent.press(screen.getByTestId('delete-r1'));
  expect(props.onDelete).toHaveBeenCalledWith(routine);

  await act(async () => { fireEvent.press(screen.getByTestId('routine-card-r1')); });
  expect(screen.getByText('Meditate')).toBeTruthy();       // section item resolved on expand
});
