import { render, screen, fireEvent } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import RoutineCard from '../src/ui/routines/RoutineCard';

const routine = {
  id: 'r1', name: 'Morning', iconId: 'lucide:sun', level: 2, xp: 50, actualLevelXp: 0, nextLevelXp: 100,
  routineSections: [{ id: 's1', name: 'Wake', iconId: '', startTime: '06:00', endTime: '07:00', order: 0 }],
} as never;

const wrap = (n: React.ReactElement) => render(<BeyouThemeProvider>{n}</BeyouThemeProvider>);

test('renders the routine name + section count and fires onPress', async () => {
  const onPress = jest.fn();
  await wrap(<RoutineCard routine={routine} onPress={onPress} />);
  expect(screen.getByText('Morning')).toBeTruthy();
  fireEvent.press(screen.getByTestId('routine-card-r1'));
  expect(onPress).toHaveBeenCalledWith(routine);
});
