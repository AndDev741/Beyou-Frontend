/**
 * CategoryForm — create posts the correct DTO (icon key + experience enum),
 * validation blocks an empty form, edit PUTs. No importance/difficulty/categories
 * (categories carry xp/level instead). Boundary mocked: notify + @beyou/api HttpClient.
 */
jest.mock('../src/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import CategoryForm from '../src/ui/categories/CategoryForm';
import { iconRecents } from '../src/ui/icons/iconRecents';
import { notify } from '../src/notify';

const categoryFixture = {
  id: 'cat1',
  name: 'Health',
  description: 'body & mind',
  iconId: 'lucide:heart',
  xp: 50,
  level: 2,
  actualLevelXp: 0,
  nextLevelXp: 100,
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

describe('CategoryForm create', () => {
  it('posts the correct DTO (icon + experience enum)', async () => {
    const onSaved = jest.fn();
    const onClose = jest.fn();
    await wrap(<CategoryForm visible mode="create" onClose={onClose} onSaved={onSaved} />);

    await act(async () => { fireEvent.changeText(screen.getByTestId('category-name'), 'Finance'); });

    // Pick an icon through the picker.
    await act(async () => { fireEvent.press(screen.getByTestId('category-icon')); });
    await act(async () => { fireEvent.changeText(screen.getByTestId('icon-picker-search'), 'house'); });
    await act(async () => { fireEvent.press(screen.getAllByLabelText(/^Icon: /)[0]); });

    // Experience defaults to Beginner; pick Intermediate to exercise the enum mapping.
    await act(async () => { fireEvent.press(screen.getByText('Intermediate')); });

    await act(async () => { fireEvent.press(screen.getByTestId('category-submit')); });

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/category');
    expect(body).toMatchObject({ name: 'Finance', experience: 'INTERMEDIARY' });
    expect(body.icon).toMatch(/^(lucide:|emoji:)/);
    expect(notify.success).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  }, 20000);

  it('blocks submit when required fields are missing', async () => {
    await wrap(<CategoryForm visible mode="create" onClose={jest.fn()} onSaved={jest.fn()} />);
    await act(async () => { fireEvent.press(screen.getByTestId('category-submit')); });
    expect(post).not.toHaveBeenCalled();
  });
});

describe('CategoryForm edit', () => {
  it('seeds from the category and PUTs the update (no experience field)', async () => {
    const onSaved = jest.fn();
    await wrap(<CategoryForm visible mode="edit" category={categoryFixture} onClose={jest.fn()} onSaved={onSaved} />);

    expect(screen.getByDisplayValue('Health')).toBeTruthy();
    expect(screen.queryByText('Intermediate')).toBeNull(); // experience is create-only

    await act(async () => { fireEvent.changeText(screen.getByTestId('category-name'), 'Health & Fitness'); });
    await act(async () => { fireEvent.press(screen.getByTestId('category-submit')); });

    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    const [url, body] = put.mock.calls[0];
    expect(url).toBe('/category');
    expect(body).toMatchObject({ categoryId: 'cat1', name: 'Health & Fitness' });
    expect(onSaved).toHaveBeenCalled();
  });
});
