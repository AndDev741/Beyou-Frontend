import { render, screen } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import ScheduleIndicator from '../src/ui/routines/ScheduleIndicator';

const wrap = (n: React.ReactElement) => render(<BeyouThemeProvider>{n}</BeyouThemeProvider>);

test('renders abbreviated days', async () => {
  await wrap(<ScheduleIndicator days={['Monday', 'Wednesday', 'Friday']} />);
  expect(screen.getByText('Mon · Wed · Fri')).toBeTruthy();
});

test('renders the empty state when no days', async () => {
  await wrap(<ScheduleIndicator days={[]} />);
  expect(screen.getByText('No schedule set')).toBeTruthy();
});
