import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import SectionCard from '../src/ui/routines/SectionCard';

const section = { id: 's1', name: 'Wake', iconId: 'lucide:sun', startTime: '06:00', endTime: '07:00', order: 0, habitGroup: [{ habitId: 'h1', startTime: '06:10' }], taskGroup: [] } as never;
const wrap = (n: React.ReactElement) => render(<BeyouThemeProvider>{n}</BeyouThemeProvider>);

test('renders the section and fires actions', async () => {
  const onEdit = jest.fn(), onAssign = jest.fn(), onMove = jest.fn(), onRemove = jest.fn();
  await wrap(<SectionCard section={section} index={0} count={2} onEdit={onEdit} onAssign={onAssign} onMove={onMove} onRemove={onRemove} />);
  expect(screen.getByText('Wake')).toBeTruthy();
  await act(async () => {
    fireEvent.press(screen.getByTestId('section-edit'));
  });
  expect(onEdit).toHaveBeenCalled();
  await act(async () => {
    fireEvent.press(screen.getByTestId('section-down'));
  });
  expect(onMove).toHaveBeenCalledWith(1);
});
