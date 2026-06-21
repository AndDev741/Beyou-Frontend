import { Provider } from 'react-redux';
import { render, screen } from '@testing-library/react-native';
import { enterHabits } from '@beyou/state/habit/habitsSlice';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import RoutineDetail from '../src/ui/routines/RoutineDetail';

const routine = {
  id: 'r1', name: 'Morning', iconId: 'lucide:sun',
  routineSections: [{
    id: 's1', name: 'Wake', iconId: 'lucide:sun', startTime: '06:00', endTime: '07:00', order: 0,
    habitGroup: [{ id: 'g1', habitId: 'h1', startTime: '06:10' }], taskGroup: [],
  }],
} as never;

test('renders sections + resolved item names', async () => {
  const store = makeStore();
  store.dispatch(enterHabits([{ id: 'h1', name: 'Meditate', iconId: 'lucide:brain' }] as never));
  await render(
    <Provider store={store}><BeyouThemeProvider><RoutineDetail routine={routine} /></BeyouThemeProvider></Provider>,
  );
  expect(screen.getByText('Wake')).toBeTruthy();
  expect(screen.getByText('Meditate')).toBeTruthy();
});
