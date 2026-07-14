// Polyfill crypto.getRandomValues FIRST — the shared `uuid` package (used by the
// AI routine materialize flow) needs it, and React Native/Hermes doesn't provide it.
import 'react-native-get-random-values';
import '../global.css';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { Stack, useRouter, useSegments } from 'expo-router';
import Toast from 'react-native-toast-message';
import '../src/i18n';
import { fetch as expoFetch } from 'expo/fetch';
import { setAgentStreamConfig, setHttpClient, setLogger } from '@beyou/api';
import { store, type RootState, type AppDispatch } from '../src/store';
import { nativeHttpClient, setAccessToken, setRefreshHandler, setOnUnauthenticated, getApiBaseUrl, getAccessToken, refreshAccessToken } from '../src/lib/nativeHttpClient';
import { refreshRequest } from '../src/auth/authApi';
import * as secureStore from '../src/auth/secureStore';
import { bootstrap, logout } from '../src/auth/authSlice';
import { nextAuthRoute } from '../src/auth/authRedirect';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import ThemeSync from '../src/theme/ThemeSync';
import LanguageSync from '../src/i18n/LanguageSync';
import ViewFiltersSync from '../src/viewFilters/ViewFiltersSync';
import { TutorialProvider } from '../src/tutorial/TutorialProvider';
import TutorialSync from '../src/tutorial/TutorialSync';
import ErrorBoundary from '../src/ui/ErrorBoundary';

setHttpClient(nativeHttpClient);
setLogger({ error: (...a: unknown[]) => console.error(...a) });
// SSE streaming needs expo/fetch — RN's global fetch buffers the whole body.
// Borrows the same base URL, fresh access token, and single-flight refresh.
setAgentStreamConfig({
  baseUrl: getApiBaseUrl(),
  getHeaders: (): Record<string, string> => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
  refreshAuth: refreshAccessToken,
  fetchImpl: expoFetch as unknown as typeof fetch,
});
setRefreshHandler(async () => {
  const stored = await secureStore.getRefreshToken();
  if (!stored) return false;
  try {
    const { accessToken, refreshToken } = await refreshRequest(stored);
    await secureStore.setRefreshToken(refreshToken);
    setAccessToken(accessToken);
    return true;
  } catch {
    await secureStore.clearRefreshToken();
    return false;
  }
});

function Gate() {
  const dispatch = useDispatch<AppDispatch>();
  const status = useSelector((s: RootState) => s.auth.status);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    setOnUnauthenticated(() => {
      dispatch(logout());
    });
    dispatch(bootstrap());
  }, [dispatch]);

  useEffect(() => {
    const target = nextAuthRoute(status, segments);
    if (target) router.replace(target);
  }, [status, segments, router]);

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <TutorialProvider>
        <SafeAreaProvider>
          <BeyouThemeProvider>
            <ThemeSync />
            <LanguageSync />
            <ViewFiltersSync />
            <TutorialSync />
            <ErrorBoundary>
              <Gate />
            </ErrorBoundary>
            <Toast />
          </BeyouThemeProvider>
        </SafeAreaProvider>
      </TutorialProvider>
    </Provider>
  );
}
