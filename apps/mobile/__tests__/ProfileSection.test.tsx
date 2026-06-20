/**
 * ProfileSection (P5-A1) — renders profile fields from the perfil slice and
 * saves via editUser (+ perfil dispatches + toast). Boundary mocked: notify and
 * the @beyou/api HttpClient.
 */
jest.mock('../src/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import { hydratePerfil } from '@beyou/state/user/perfilSlice';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import ProfileSection from '../src/ui/config/ProfileSection';
import { notify } from '../src/notify';

const userFixture = { name: 'Bob', email: 'a@b.com', phrase: 'hi', phrase_author: 'me' };

function seedStore() {
  const store = makeStore();
  store.dispatch(hydratePerfil({ name: 'Alice', email: 'a@b.com', phrase: 'hi', phrase_author: 'me' }));
  return store;
}

let putSpy: jest.Mock;
beforeEach(() => {
  putSpy = jest.fn(async () => ({ data: userFixture }));
  const noop = async () => ({ data: null });
  setHttpClient({ get: noop, post: noop, put: putSpy, delete: noop } as never);
  setLogger({ error: () => {} });
  (notify.success as jest.Mock).mockClear();
  (notify.error as jest.Mock).mockClear();
});

const renderSection = (store: ReturnType<typeof makeStore>) =>
  render(
    <Provider store={store}>
      <BeyouThemeProvider>
        <ProfileSection />
      </BeyouThemeProvider>
    </Provider>,
  );

describe('ProfileSection', () => {
  it('renders the current profile values', async () => {
    await renderSection(seedStore());
    expect(screen.getByDisplayValue('Alice')).toBeTruthy();
    expect(screen.getByDisplayValue('a@b.com')).toBeTruthy();
  });

  it('saves edits via editUser and updates the perfil slice', async () => {
    const store = seedStore();
    await renderSection(store);

    fireEvent.changeText(screen.getByDisplayValue('Alice'), 'Bob');
    await act(async () => {
      fireEvent.press(screen.getByTestId('save-profile'));
    });

    await waitFor(() => expect(putSpy).toHaveBeenCalledWith('/user', expect.objectContaining({ name: 'Bob' })));
    expect(store.getState().perfil.username).toBe('Bob');
    expect(notify.success).toHaveBeenCalled();
  });
});
