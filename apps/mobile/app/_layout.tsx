import '../global.css';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { Stack, useRouter, useSegments } from 'expo-router';
import Toast from 'react-native-toast-message';
import '../src/i18n';
import { setHttpClient, setLogger } from '@beyou/api';
import { store, type RootState, type AppDispatch } from '../src/store';
import { nativeHttpClient, setAccessToken, setRefreshHandler, setOnUnauthenticated } from '../src/lib/nativeHttpClient';
import { refreshRequest } from '../src/auth/authApi';
import * as secureStore from '../src/auth/secureStore';
import { bootstrap, logout } from '../src/auth/authSlice';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';

setHttpClient(nativeHttpClient);
setLogger({ error: (...a: unknown[]) => console.error(...a) });
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
    if (status === 'loading') return;
    const inAuth = segments[0] === '(auth)';
    if (status === 'authenticated' && inAuth) router.replace('/(app)');
    else if (status === 'unauthenticated' && !inAuth) router.replace('/(auth)/login');
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
      <SafeAreaProvider>
        <BeyouThemeProvider>
          <Gate />
          <Toast />
        </BeyouThemeProvider>
      </SafeAreaProvider>
    </Provider>
  );
}
