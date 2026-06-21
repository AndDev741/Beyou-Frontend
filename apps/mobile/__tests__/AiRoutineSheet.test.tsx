jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import AiRoutineSheet from '../src/ui/routines/AiRoutineSheet';

const draft = { name: 'AI Morning', iconId: null, newCategories: [], scheduleDays: null,
  sections: [{ name: 'Wake', iconId: null, startTime: '06:00', endTime: '07:00',
    habits: [{ existingHabitId: 'h1', startTime: '06:10', endTime: null }], tasks: [] }] };
const materialized = { name: 'AI Morning', iconId: null, scheduleDays: null, newCategoryIds: [], newHabitIds: [], newTaskIds: [],
  sections: [{ name: 'Wake', iconId: null, startTime: '06:00', endTime: '07:00',
    habitGroup: [{ habitId: 'h1', startTime: '06:10', endTime: null }], taskGroup: [] }] };

const wrap = (n: React.ReactElement) => render(<BeyouThemeProvider>{n}</BeyouThemeProvider>);

test('blocks generate when the description is too short', async () => {
  const post = jest.fn();
  setHttpClient({ get: async () => ({ data: [] }), post, put: post, delete: post } as never);
  setLogger({ error: () => {} });
  await wrap(<AiRoutineSheet visible onClose={jest.fn()} onReady={jest.fn()} />);
  await act(async () => { fireEvent.changeText(screen.getByTestId('ai-description'), 'short'); });
  await act(async () => { fireEvent.press(screen.getByTestId('ai-generate')); });
  expect(post).not.toHaveBeenCalled();
});

test('generate → materialize → onReady with mapped sections', async () => {
  const post = jest.fn(async (url: string) =>
    url.includes('/generate') ? { data: { success: { draft } } } : { data: { success: materialized } });
  setHttpClient({ get: async () => ({ data: [] }), post, put: post, delete: post } as never);
  setLogger({ error: () => {} });
  const onReady = jest.fn();
  await wrap(<AiRoutineSheet visible onClose={jest.fn()} onReady={onReady} />);
  await act(async () => { fireEvent.changeText(screen.getByTestId('ai-description'), 'I wake at 6 and meditate then read before bed every morning'); });
  await act(async () => { fireEvent.press(screen.getByTestId('ai-generate')); });
  await waitFor(() => expect(onReady).toHaveBeenCalled());
  const [name, sections] = onReady.mock.calls[0];
  expect(name).toBe('AI Morning');
  expect(sections[0]).toEqual(expect.objectContaining({ name: 'Wake' }));
  expect(sections[0].habitGroup[0]).toEqual(expect.objectContaining({ habitId: 'h1' }));
}, 20000);
