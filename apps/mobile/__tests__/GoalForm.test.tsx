/**
 * GoalForm — create posts the correct DTO (name + numeric target/current + unit +
 * dates + status/term), validation blocks an empty form, edit PUTs. Boundary mocked:
 * notify + @beyou/api HttpClient.
 */
jest.mock('../src/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import GoalForm from '../src/ui/goals/GoalForm';
import { iconRecents } from '../src/ui/icons/iconRecents';
import { notify } from '../src/notify';

const categories = [{ id: 'c1', name: 'Health', iconId: 'lucide:heart' }] as never[];
const goalFixture = {
  id: 'g1', name: 'Read books', iconId: 'lucide:book', description: 'grow', targetValue: 12, unit: 'books',
  currentValue: 3, complete: false, categories: { c1: { name: 'Health', iconId: 'lucide:heart' } },
  motivation: 'learn', startDate: '2026-01-01', endDate: '2026-12-31', xpReward: 50, status: 'IN_PROGRESS', term: 'LONG_TERM',
} as never;

let post: jest.Mock, put: jest.Mock;
beforeEach(() => {
  iconRecents.clearRecentIcons();
  post = jest.fn(async () => ({ data: { success: true } }));
  put = jest.fn(async () => ({ data: { success: true } }));
  const noop = async () => ({ data: null });
  setHttpClient({ get: noop, post, put, delete: noop } as never);
  setLogger({ error: () => {} });
  (notify.success as jest.Mock).mockClear();
  (notify.error as jest.Mock).mockClear();
});

const wrap = (node: React.ReactElement) => render(<BeyouThemeProvider>{node}</BeyouThemeProvider>);
const setDate = async (testID: string, d: Date) => {
  await act(async () => { fireEvent.press(screen.getByTestId(testID)); });
  await act(async () => { fireEvent(screen.getByTestId(`${testID}-picker`), 'onChange', { type: 'set' }, d); });
};

describe('GoalForm create', () => {
  it('posts the correct DTO (numeric values + unit + dates + status/term)', async () => {
    const onSaved = jest.fn();
    const onClose = jest.fn();
    await wrap(<GoalForm visible mode="create" categories={categories} onClose={onClose} onSaved={onSaved} />);

    await act(async () => { fireEvent.changeText(screen.getByTestId('goal-title'), 'Read 12 books'); });
    await act(async () => { fireEvent.press(screen.getByTestId('goal-icon')); });
    await act(async () => { fireEvent.changeText(screen.getByTestId('icon-picker-search'), 'house'); });
    await act(async () => { fireEvent.press(screen.getAllByLabelText(/^Icon: /)[0]); });
    await act(async () => { fireEvent.changeText(screen.getByTestId('goal-target'), '12'); });
    await act(async () => { fireEvent.changeText(screen.getByTestId('goal-unit'), 'books'); });
    await setDate('goal-start', new Date(2026, 0, 1));
    await setDate('goal-end', new Date(2026, 11, 31));

    await act(async () => { fireEvent.press(screen.getByTestId('goal-submit')); });

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/goal');
    expect(body).toMatchObject({
      name: 'Read 12 books',
      targetValue: 12,
      unit: 'books',
      status: 'NOT_STARTED',
      term: 'SHORT_TERM',
    });
    expect(body.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(notify.success).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
  }, 20000);

  it('blocks submit when required fields are missing', async () => {
    await wrap(<GoalForm visible mode="create" categories={categories} onClose={jest.fn()} onSaved={jest.fn()} />);
    await act(async () => { fireEvent.press(screen.getByTestId('goal-submit')); }); // no title/icon/unit/dates
    expect(post).not.toHaveBeenCalled();
  });
});

describe('GoalForm edit', () => {
  it('seeds from the goal and PUTs the update', async () => {
    const onSaved = jest.fn();
    await wrap(<GoalForm visible mode="edit" goal={goalFixture} categories={categories} onClose={jest.fn()} onSaved={onSaved} />);

    expect(screen.getByDisplayValue('Read books')).toBeTruthy();
    expect(screen.getByDisplayValue('books')).toBeTruthy();

    await act(async () => { fireEvent.changeText(screen.getByTestId('goal-title'), 'Read 20 books'); });
    await act(async () => { fireEvent.press(screen.getByTestId('goal-submit')); });

    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    const [url, body] = put.mock.calls[0];
    expect(url).toBe('/goal');
    expect(body).toMatchObject({ goalId: 'g1', name: 'Read 20 books', targetValue: 12, unit: 'books', status: 'IN_PROGRESS', term: 'LONG_TERM' });
    expect(onSaved).toHaveBeenCalled();
  });
});
