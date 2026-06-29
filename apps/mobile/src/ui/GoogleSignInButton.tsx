import { useState } from 'react';
import { Pressable, Text, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { getLogger } from '@beyou/api';

import { notify } from '../notify';
import { useBeyouTheme } from '../theme/ThemeProvider';
import { googleLogin } from '../auth/authSlice';
import type { AppDispatch } from '../store';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// The native lib matches the Android OAuth client by package + signing SHA-1; only
// the WEB client id is passed here, so the returned ID token's audience is the web
// client — which the backend's GOOGLE_MOBILE_AUDIENCES accepts. configure() is
// idempotent and safe to run at module load (EXPO_PUBLIC_* is inlined at build).
if (!WEB_CLIENT_ID) {
  // Missing here means EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID wasn't inlined at bundle
  // time → signIn() will return a null idToken and the flow can't complete. Most
  // often: .env not present, or Metro not restarted with `expo start -c`.
  getLogger().error('GoogleSignInButton: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set');
}
GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });

/**
 * "Continue with Google" button: runs the native Google sign-in, then exchanges the
 * resulting ID token for a BeYou session via the googleLogin thunk. On success the
 * root Gate redirects into the app; cancellation is a silent no-op.
 */
export default function GoogleSignInButton() {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const dispatch = useDispatch<AppDispatch>();
  const [busy, setBusy] = useState(false);

  const onPress = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (isSuccessResponse(response)) {
        const idToken = response.data.idToken;
        if (!idToken) {
          // signIn succeeded but no ID token → webClientId missing/mismatched.
          getLogger().error('Google sign-in returned no idToken (check EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID)');
          notify.error(t('SomethingWentWrong'));
          return;
        }
        const res = await dispatch(googleLogin(idToken));
        if (googleLogin.rejected.match(res)) notify.error(t('SomethingWentWrong'));
        // success → status becomes 'authenticated'; the Gate handles navigation.
      }
      // cancelled response → no-op
    } catch (e) {
      // The user backing out of the picker is not an error.
      if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) return;
      // Surface the real cause (e.g. DEVELOPER_ERROR = SHA-1 / package / client-id
      // mismatch, or PLAY_SERVICES_NOT_AVAILABLE) instead of swallowing it.
      getLogger().error('Google sign-in failed', e);
      notify.error(t('SomethingWentWrong'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      testID="google-signin-button"
      className={`w-[250px] h-[52px] flex-row items-center justify-center gap-2 rounded-[20px] border border-description bg-background ${busy ? 'opacity-60' : ''}`}
    >
      {busy ? (
        <ActivityIndicator color={theme.primary} />
      ) : (
        <>
          <Ionicons name="logo-google" size={20} color={theme.primary} />
          <Text className="text-secondary text-lg font-semibold">{t('ContinueWithGoogle')}</Text>
        </>
      )}
    </Pressable>
  );
}
