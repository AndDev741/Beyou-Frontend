import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import { setOnline, setPendingOps } from '../src/offline/connectivitySlice';
import OfflineBanner from '../src/ui/offline/OfflineBanner';

const wrap = (store: ReturnType<typeof makeStore>, node: React.ReactElement) =>
  render(
    <Provider store={store}>
      <BeyouThemeProvider>
        {node}
      </BeyouThemeProvider>
    </Provider>
  );

test('hidden while online or unknown', async () => {
  const store = makeStore();
  await wrap(store, <OfflineBanner />);
  expect(screen.queryByTestId('offline-banner')).toBeNull();
  await act(async () => {
    store.dispatch(setOnline(true));
  });
  expect(screen.queryByTestId('offline-banner')).toBeNull();
});

test('shows when offline, closes on dismiss, and stays closed for the episode', async () => {
  const store = makeStore();
  await wrap(store, <OfflineBanner />);
  await act(async () => {
    store.dispatch(setOnline(false));
    store.dispatch(setPendingOps(2));
  });
  expect(screen.getByTestId('offline-banner')).toBeTruthy();
  await act(async () => {
    fireEvent.press(screen.getByTestId('offline-banner-close'));
  });
  expect(screen.queryByTestId('offline-banner')).toBeNull();
  await act(async () => {
    store.dispatch(setOnline(false)); // same episode — still hidden
  });
  expect(screen.queryByTestId('offline-banner')).toBeNull();
});

test('reappears on a NEW offline episode', async () => {
  const store = makeStore();
  await wrap(store, <OfflineBanner />);
  await act(async () => {
    store.dispatch(setOnline(false));
  });
  await act(async () => {
    fireEvent.press(screen.getByTestId('offline-banner-close'));
  });
  await act(async () => {
    store.dispatch(setOnline(true));
    store.dispatch(setOnline(false));
  });
  expect(screen.getByTestId('offline-banner')).toBeTruthy();
});
