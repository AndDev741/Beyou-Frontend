/**
 * Removing a profile photo from the phone.
 *
 * A photo is stored in two places on the server and read in priority order: an
 * uploaded file wins, the Google avatar URL is the fallback. Neither client had any
 * way to remove one, and the removal-shaped call that existed — an edit with an empty
 * `photo` — clears the column the server skips while a file is there, so the photo
 * came back on the next profile read. So what these tests watch for is the DELETE
 * going out and the screen taking the server's answer for what is left.
 *
 * Its own file rather than a third case in ProfileSection.test.tsx: a third mount in
 * that file renders null (the earlier submit test leaves a promise in flight and wedges
 * the renderer), which has nothing to do with photos.
 */
jest.mock('../src/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { Provider } from 'react-redux';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import { hydratePerfil } from '@beyou/state/user/perfilSlice';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import ProfileSection from '../src/ui/config/ProfileSection';
import { notify } from '../src/notify';

const profile = { name: 'Alice', email: 'a@b.com', phrase: 'hi', phrase_author: 'me' };

function seedStore(photo?: string) {
  const store = makeStore();
  store.dispatch(hydratePerfil({ ...profile, photo }));
  return store;
}

let deleteSpy: jest.Mock;
let getSpy: jest.Mock;

beforeEach(() => {
  const noop = async () => ({ data: null });
  deleteSpy = jest.fn(async () => ({ data: null }));
  // The re-read after a removal. It answers with no photo at all, which is what the
  // server says once the file and the column have both gone.
  getSpy = jest.fn(async () => ({ data: { ...profile, photo: null } }));
  setHttpClient({ get: getSpy, post: noop, put: noop, delete: deleteSpy } as never);
  setLogger({ error: () => {} });
  (notify.success as jest.Mock).mockClear();
  (notify.error as jest.Mock).mockClear();
});

// Awaited: the render's first paint lands on the microtask after this call, and the
// queries below find nothing without it.
const renderSection = (store: ReturnType<typeof makeStore>) =>
  render(
    <Provider store={store}>
      <BeyouThemeProvider>
        <ProfileSection />
      </BeyouThemeProvider>
    </Provider>,
  );

describe('profile photo removal', () => {
  it('removes the photo through DELETE /user/photo and re-reads what is left', async () => {
    const store = seedStore('/api/v1/user/photo/abc?v=1');
    const view = await renderSection(store);

    await act(async () => {
      fireEvent.press(view.getByTestId('change-photo'));
    });
    await act(async () => {
      fireEvent.press(view.getByTestId('remove-photo'));
    });
    await act(async () => {
      fireEvent.press(view.getByTestId('confirm-remove-photo'));
    });

    await waitFor(() => expect(deleteSpy).toHaveBeenCalledWith('/user/photo'));
    // Not assumed gone: an account that signed in with Google had two photos stored
    // and the server decides which of them survives.
    await waitFor(() => expect(getSpy).toHaveBeenCalled());
    await waitFor(() => expect(store.getState().perfil.photo).toBeFalsy());
    expect(notify.success).toHaveBeenCalled();
  });

  it('offers nothing to remove when the account has no photo', async () => {
    const view = await renderSection(seedStore());

    await act(async () => {
      fireEvent.press(view.getByTestId('change-photo'));
    });

    expect(view.queryByTestId('remove-photo')).toBeNull();
    expect(deleteSpy).not.toHaveBeenCalled();
  });
});
