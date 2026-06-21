/**
 * Routine detail route (P7 PR1) — delete via Alert confirm → deleteRoutine.
 * Boundary mocked = @beyou/api HttpClient + expo-router (useRouter + useLocalSearchParams) + notify.
 */
jest.mock('../src/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
  useLocalSearchParams: () => ({ id: 'r1' }),
}));

import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { enterRoutines } from '@beyou/state/routine/routinesSlice';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import RoutineDetailScreen from '../app/(app)/routines/[id]';

let del: jest.Mock;

function setHttp() {
  const get = async () => ({ data: [] });
  del = jest.fn(async () => ({ data: { success: true } }));
  setHttpClient({ get, post: get, put: get, delete: del } as never);
  setLogger({ error: () => {} });
}

describe('RoutineDetailScreen — delete', () => {
  it('calls DELETE /routine/r1 after Alert destructive button is pressed', async () => {
    setHttp();

    const store = makeStore();
    store.dispatch(
      enterRoutines([{ id: 'r1', name: 'Morning', iconId: 'lucide:sun', routineSections: [] }] as never),
    );

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      (buttons ?? []).find((b) => b.style === 'destructive')?.onPress?.();
    });

    await render(
      <Provider store={store}>
        <BeyouThemeProvider>
          <RoutineDetailScreen />
        </BeyouThemeProvider>
      </Provider>,
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-routine'));
    });

    await waitFor(() => expect(del).toHaveBeenCalledWith('/routine/r1'));

    alertSpy.mockRestore();
  });
});
