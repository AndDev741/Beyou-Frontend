/**
 * HabitForm (P6-B3) — create posts the right DTO (dificulty spelling + experience
 * enum + categoriesId + labeled importance/difficulty), validation blocks an empty
 * form, edit PUTs. Delete lives on the card/screen now, not the form. Boundary
 * mocked: notify + the @beyou/api HttpClient.
 */
jest.mock('../src/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import HabitForm from '../src/ui/habits/HabitForm';
import { iconRecents } from '../src/ui/icons/iconRecents';
import { notify } from '../src/notify';

const categories = [{ id: 'c1', name: 'Health', iconId: 'lucide:heart' }] as never[];
const habitFixture = {
  id: 'h1',
  name: 'Read',
  description: 'books',
  motivationalPhrase: 'grow',
  iconId: 'lucide:book',
  importance: 3,
  dificulty: 2,
  categories: [{ id: 'c1', name: 'Health', iconId: 'lucide:heart' }],
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

const wrap = (node: React.ReactElement) =>
  render(<BeyouThemeProvider>{node}</BeyouThemeProvider>);

describe('HabitForm create', () => {
  it('posts the correct DTO (dificulty + experience enum + categoriesId)', async () => {
    const onSaved = jest.fn();
    const onClose = jest.fn();
    await wrap(
      <HabitForm visible mode="create" categories={categories} onClose={onClose} onSaved={onSaved} />,
    );

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('habit-name'), 'Meditate');
    });

    // Pick an icon through the picker.
    await act(async () => {
      fireEvent.press(screen.getByTestId('habit-icon'));
    });
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('icon-picker-search'), 'house');
    });
    await act(async () => {
      fireEvent.press(screen.getAllByLabelText(/^Icon: /)[0]);
    });

    // Pick a category + importance (Low=1) + difficulty (Easy=1).
    await act(async () => {
      fireEvent.press(screen.getByTestId('category-c1'));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Low'));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Easy'));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('habit-submit'));
    });

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/habit');
    expect(body).toMatchObject({
      name: 'Meditate',
      importance: 1,
      dificulty: 1,
      categoriesId: ['c1'],
      experience: 'BEGINNER',
    });
    expect(body.iconId).toMatch(/^(lucide:|emoji:)/);
    expect(notify.success).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    // Heavy integration test (drives the icon-picker grid through ~8 act cycles);
    // the 5s default is too tight on slower CI runners.
  }, 20000);

  it('blocks submit when required fields are missing', async () => {
    await wrap(<HabitForm visible mode="create" categories={categories} onClose={jest.fn()} onSaved={jest.fn()} />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('habit-submit'));
    });
    expect(post).not.toHaveBeenCalled();
  });
});

describe('HabitForm edit', () => {
  it('seeds from the habit and PUTs the update', async () => {
    const onSaved = jest.fn();
    await wrap(
      <HabitForm visible mode="edit" habit={habitFixture} categories={categories} onClose={jest.fn()} onSaved={onSaved} />,
    );

    expect(screen.getByDisplayValue('Read')).toBeTruthy();

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('habit-name'), 'Read more');
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('habit-submit'));
    });

    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    const [url, body] = put.mock.calls[0];
    expect(url).toBe('/habit');
    expect(body).toMatchObject({ habitId: 'h1', name: 'Read more', dificulty: 2, importance: 3 });
    expect(onSaved).toHaveBeenCalled();
  });
});
