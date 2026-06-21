import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import SectionSheet from '../src/ui/routines/SectionSheet';

const wrap = (n: React.ReactElement) => render(<BeyouThemeProvider>{n}</BeyouThemeProvider>);

test('emits an edited section and blocks when name is empty', async () => {
  const onSave = jest.fn();
  await wrap(<SectionSheet visible section={null} onSave={onSave} onClose={jest.fn()} />);

  // Empty name -> blocked.
  await act(async () => { fireEvent.press(screen.getByTestId('section-save')); });
  expect(onSave).not.toHaveBeenCalled();

  await act(async () => { fireEvent.changeText(screen.getByTestId('section-name'), 'Morning'); });
  await act(async () => { fireEvent.press(screen.getByTestId('section-start')); });
  const d = new Date(); d.setHours(6, 0, 0, 0);
  await act(async () => { fireEvent(screen.getByTestId('section-start-picker'), 'onChange', { type: 'set' }, d); });
  await act(async () => { fireEvent.press(screen.getByTestId('section-save')); });

  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Morning', startTime: '06:00' }));
});
