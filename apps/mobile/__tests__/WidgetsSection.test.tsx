/**
 * WidgetsSection (P5-B4) — the dashboard widget picker. Add/remove/reorder edit a
 * local working copy; Save persists { widgetsId } via editUser and dispatches
 * widgetsIdInUseEnter. Boundary mocked: notify, the @beyou/api HttpClient.
 */
jest.mock('../src/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import { widgetsIdInUseEnter } from '@beyou/state/user/perfilSlice';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import WidgetsSection from '../src/ui/config/WidgetsSection';

let putSpy: jest.Mock;
beforeEach(() => {
  putSpy = jest.fn(async () => ({ data: {} }));
  const noop = async () => ({ data: null });
  setHttpClient({ get: noop, post: noop, put: putSpy, delete: noop } as never);
  setLogger({ error: () => {} });
});

function renderWith(store: ReturnType<typeof makeStore>) {
  return render(
    <Provider store={store}>
      <BeyouThemeProvider>
        <WidgetsSection />
      </BeyouThemeProvider>
    </Provider>,
  );
}

describe('WidgetsSection', () => {
  it('shows the empty hint when nothing is current, and adding moves it to current', async () => {
    const store = makeStore();
    store.dispatch(widgetsIdInUseEnter([]));
    await renderWith(store);

    expect(screen.getByTestId('widgets-current-empty')).toBeTruthy();
    // "constance" starts available.
    await act(async () => {
      fireEvent.press(screen.getByTestId('widget-add-constance'));
    });
    expect(screen.getByTestId('widget-current-constance')).toBeTruthy();
    expect(screen.queryByTestId('widget-add-constance')).toBeNull();
  });

  it('removing a widget returns it to available', async () => {
    const store = makeStore();
    store.dispatch(widgetsIdInUseEnter(['constance', 'fastTips']));
    await renderWith(store);

    await act(async () => {
      fireEvent.press(screen.getByTestId('widget-remove-constance'));
    });
    expect(screen.queryByTestId('widget-current-constance')).toBeNull();
    expect(screen.getByTestId('widget-add-constance')).toBeTruthy();
  });

  it('reorders with the down control and Save persists the new order', async () => {
    const store = makeStore();
    store.dispatch(widgetsIdInUseEnter(['constance', 'fastTips']));
    await renderWith(store);

    // Move "constance" down → order becomes [fastTips, constance].
    await act(async () => {
      fireEvent.press(screen.getByTestId('widget-down-constance'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('save-widgets'));
    });

    await waitFor(() =>
      expect(putSpy).toHaveBeenCalledWith('/user', { widgetsId: ['fastTips', 'constance'] }),
    );
    expect(store.getState().perfil.widgetsIdsInUse).toEqual(['fastTips', 'constance']);
  });
});
