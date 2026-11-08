import { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import type { WeekDay } from '@beyou/types/schedule/weekDay';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import WeekdayPicker from '../src/ui/routines/WeekdayPicker';

const wrap = (n: React.ReactElement) => render(<BeyouThemeProvider>{n}</BeyouThemeProvider>);

test('names each square by the whole day and marks the selected ones', async () => {
  await wrap(<WeekdayPicker value={['Saturday']} onToggle={jest.fn()} />);

  expect(screen.getByLabelText('Saturday').props.accessibilityState.selected).toBe(true);
  expect(screen.getByLabelText('Friday').props.accessibilityState.selected).toBe(false);
  expect(screen.getAllByRole('button')).toHaveLength(7);
});

test('a press hands the day to the caller', async () => {
  const onToggle = jest.fn();
  await wrap(<WeekdayPicker value={[]} onToggle={onToggle} testIDPrefix="item" />);

  await act(async () => { fireEvent.press(screen.getByTestId('item-Wednesday')); });

  expect(onToggle).toHaveBeenCalledWith('Wednesday');
});

test('toggles on and off when the caller keeps the state', async () => {
  function Harness() {
    const [days, setDays] = useState<WeekDay[]>([]);
    return (
      <WeekdayPicker
        value={days}
        onToggle={(day) => setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))}
      />
    );
  }
  await wrap(<Harness />);

  await act(async () => { fireEvent.press(screen.getByTestId('day-Sunday')); });
  expect(screen.getByTestId('day-Sunday').props.accessibilityState.selected).toBe(true);

  await act(async () => { fireEvent.press(screen.getByTestId('day-Sunday')); });
  expect(screen.getByTestId('day-Sunday').props.accessibilityState.selected).toBe(false);
});

test('a blocked day is announced disabled', async () => {
  await wrap(<WeekdayPicker value={[]} onToggle={jest.fn()} isBlocked={(day) => day === 'Monday'} />);

  expect(screen.getByTestId('day-Monday').props.accessibilityState.disabled).toBe(true);
  expect(screen.getByTestId('day-Tuesday').props.accessibilityState.disabled).toBe(false);
});
