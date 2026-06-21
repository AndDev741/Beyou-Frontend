// apps/mobile/__tests__/TimeField.test.tsx
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import TimeField, { toHHmm, hhmmToDate } from '../src/ui/routines/TimeField';

const wrap = (n: React.ReactElement) => render(<BeyouThemeProvider>{n}</BeyouThemeProvider>);

test('toHHmm / hhmmToDate round-trip', () => {
  expect(toHHmm(hhmmToDate('06:05'))).toBe('06:05');
  const d = new Date(); d.setHours(9, 0, 0, 0);
  expect(toHHmm(d)).toBe('09:00');
});

test('renders the value and emits HH:mm from the picker', async () => {
  const onChange = jest.fn();
  await wrap(<TimeField value="06:00" onChange={onChange} testID="start" />);
  expect(screen.getByText('06:00')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByTestId('start')); });
  const picked = new Date(); picked.setHours(7, 30, 0, 0);
  await act(async () => { fireEvent(screen.getByTestId('start-picker'), 'onChange', { type: 'set' }, picked); });
  expect(onChange).toHaveBeenCalledWith('07:30');
});
