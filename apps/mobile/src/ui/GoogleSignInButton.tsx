import { useState } from 'react';
import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { getLogger } from '@beyou/api';

import { notify } from '../notify';
import { useBeyouTheme } from '../theme/ThemeProvider';
import { googleLogin } from '../auth/authSlice';
import { clearGoogleSession } from '../auth/googleSession';
import type { AppDispatch } from '../store';
import { RATE_LIMIT_ERROR_KEY } from '@beyou/api/apiError';

/**
 * "Continue with Google" button: runs the native Google sign-in, then exchanges the
 * resulting ID token for a Beyou session via the googleLogin thunk. On success the
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
      // Ask every time. Without this the picker is drawn once, on the very first
      // sign-in, and every later tap silently reuses that account — see
      // clearGoogleSession. Clearing at logout alone would not be enough: anyone
      // already on a build without this carries the stale entry into the update.
      await clearGoogleSession();
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
        if (googleLogin.rejected.match(res)) {
          notify.error(res.payload === RATE_LIMIT_ERROR_KEY
            ? t(RATE_LIMIT_ERROR_KEY)
            : t('SomethingWentWrong'));
        }
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
    <View className="mt-5 w-full">
      {/* A divider before the alternative: Google is the second option, not a visual
          pair for "Sign in". It ships with the button because it does on the web too. */}
      <View className="mb-4 flex-row items-center gap-3">
        <View className="h-px flex-1 bg-border" />
        <Text className="text-xs text-text-3">{t('Or')}</Text>
        <View className="h-px flex-1 bg-border" />
      </View>

      <Pressable
        onPress={onPress}
        disabled={busy}
        accessibilityRole="button"
        testID="google-signin-button"
        className={`h-11 w-full flex-row items-center justify-center gap-2.5 rounded-control border border-border bg-surface ${busy ? 'opacity-60' : 'active:bg-surface-2'}`}
      >
        {busy ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color={theme.accent} />
            <Text className="text-sm font-semibold text-text">{t('ContinueWithGoogle')}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
