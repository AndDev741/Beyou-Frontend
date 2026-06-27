/**
 * Categories screen — self-fetches categories, renders cards from the slice, shows
 * the empty state when none, exposes a sort control, and deletes (Alert confirm →
 * deleteCategory → refetch). Boundary mocked = @beyou/api HttpClient + expo-router +
 * notify + RN Alert.
 */
jest.mock('../src/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
}));

import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import CategoriesScreen from '../app/(app)/categories';

const category = {
  id: 'cat1',
  name: 'Health',
  description: 'body & mind',
  iconId: 'lucide:heart',
  xp: 50,
  level: 2,
  actualLevelXp: 0,
  nextLevelXp: 100,
};

let del: jest.Mock;
function setHttp(categories: unknown[]) {
  const get = async (url: string) => (url === '/category' ? { data: categories } : { data: [] });
  del = jest.fn(async () => ({ data: { success: true } }));
  setHttpClient({ get, post: get, put: get, delete: del } as never);
  setLogger({ error: () => {} });
}

const renderScreen = () =>
  render(
    <Provider store={makeStore()}>
      <BeyouThemeProvider>
        <CategoriesScreen />
      </BeyouThemeProvider>
    </Provider>,
  );

describe('CategoriesScreen', () => {
  it('renders fetched categories as cards + a sort control', async () => {
    setHttp([category]);
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('category-card-cat1')).toBeTruthy());
    expect(screen.getByText('Health')).toBeTruthy();
    expect(screen.getByTestId('categories-sort')).toBeTruthy();
  });

  it('shows the empty state when there are no categories', async () => {
    setHttp([]);
    await renderScreen();
    await waitFor(() => expect(screen.getByText('No categories yet')).toBeTruthy());
    expect(screen.getByTestId('empty-create-category')).toBeTruthy();
    expect(screen.queryByTestId('categories-sort')).toBeNull();
  });

  it('deletes a category after Alert confirmation', async () => {
    setHttp([category]);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      (buttons ?? []).find((b) => b.style === 'destructive')?.onPress?.();
    });
    await renderScreen();
    await waitFor(() => expect(screen.getByTestId('category-card-cat1')).toBeTruthy());

    await act(async () => { fireEvent.press(screen.getByTestId('category-card-cat1')); }); // expand
    await act(async () => { fireEvent.press(screen.getByTestId('category-delete-cat1')); });

    await waitFor(() => expect(del).toHaveBeenCalledWith('/category/cat1'));
    alertSpy.mockRestore();
  });
});
