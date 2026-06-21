jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import RoutineBuilder from '../src/ui/routines/RoutineBuilder';
import { notify } from '../src/notify';

const habits = [{ id: 'h1', name: 'Meditate', iconId: 'lucide:brain' }] as never[];
const wrap = (n: React.ReactElement) => render(<BeyouThemeProvider>{n}</BeyouThemeProvider>);

let post: jest.Mock;
beforeEach(() => {
  post = jest.fn(async () => ({ data: { success: true } }));
  const noop = async () => ({ data: null });
  setHttpClient({ get: noop, post, put: noop, delete: noop } as never);
  setLogger({ error: () => {} });
  (notify.error as jest.Mock).mockClear();
});

test('blocks save with no name/sections', async () => {
  await wrap(<RoutineBuilder visible mode="create" habits={habits} tasks={[]} onClose={jest.fn()} onSaved={jest.fn()} />);
  await act(async () => { fireEvent.press(screen.getByTestId('routine-save')); });
  expect(post).not.toHaveBeenCalled();
  expect(notify.error).toHaveBeenCalled();
});

test('posts a routine with a section', async () => {
  const onSaved = jest.fn();
  await wrap(<RoutineBuilder visible mode="create" habits={habits} tasks={[]} onClose={jest.fn()} onSaved={onSaved} />);
  await act(async () => { fireEvent.changeText(screen.getByTestId('routine-name'), 'Morning'); });

  // Add a section via the sheet.
  await act(async () => { fireEvent.press(screen.getByTestId('add-section')); });
  await act(async () => { fireEvent.changeText(screen.getByTestId('section-name'), 'Wake'); });
  await act(async () => { fireEvent.press(screen.getByTestId('section-start')); });
  const d = new Date(); d.setHours(6, 0, 0, 0);
  await act(async () => { fireEvent(screen.getByTestId('section-start-picker'), 'onChange', { type: 'set' }, d); });
  await act(async () => { fireEvent.press(screen.getByTestId('section-save')); });

  await act(async () => { fireEvent.press(screen.getByTestId('routine-save')); });

  await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
  const [url, body] = post.mock.calls[0];
  expect(url).toBe('/routine');
  expect(body.name).toBe('Morning');
  expect(body.routineSections[0]).toEqual(expect.objectContaining({ name: 'Wake', startTime: '06:00' }));
  expect(onSaved).toHaveBeenCalled();
}, 20000);
