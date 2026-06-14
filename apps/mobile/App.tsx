import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Provider, useDispatch, useSelector } from 'react-redux';
import './src/i18n';
import { setHttpClient, setLogger } from '@beyou/api';
import { store, type RootState, type AppDispatch } from './src/store';
import { nativeHttpClient, setAccessToken, setRefreshHandler, setOnUnauthenticated } from './src/lib/nativeHttpClient';
import { refreshRequest } from './src/auth/authApi';
import * as secureStore from './src/auth/secureStore';
import { bootstrap, logout } from './src/auth/authSlice';
import LoginScreen from './src/screens/LoginScreen';
import AuthedPlaceholderScreen from './src/screens/AuthedPlaceholderScreen';

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
  } catch { await secureStore.clearRefreshToken(); return false; }
});

function Root() {
  const dispatch = useDispatch<AppDispatch>();
  const status = useSelector((s: RootState) => s.auth.status);
  useEffect(() => {
    setOnUnauthenticated(() => { dispatch(logout()); });
    dispatch(bootstrap());
  }, [dispatch]);
  if (status === 'loading') return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
  return status === 'authenticated' ? <AuthedPlaceholderScreen /> : <LoginScreen />;
}

export default function App() {
  return <Provider store={store}><Root /></Provider>;
}
