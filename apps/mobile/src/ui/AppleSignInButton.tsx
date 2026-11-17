import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { getLogger } from '@beyou/api';
import { RATE_LIMIT_ERROR_KEY } from '@beyou/api/apiError';

import { notify } from '../notify';
import { useBeyouTheme } from '../theme/ThemeProvider';
import { appleLogin, APPLE_ACCOUNT_ALREADY_LINKED } from '../auth/authSlice';
import type { AppDispatch } from '../store';

/** Same height as the Google button and the primary button above it (h-11). */
const BUTTON_HEIGHT = 44;
/** The `rounded-control` radius of the app's other auth buttons. */
const CORNER_RADIUS = 10;

/**
 * A random value per sign-in, and its SHA-256. Apple puts the hash in the identity
 * token; the backend gets the raw value and checks one against the other, so a token
 * cannot be replayed for a different request.
 */
export async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const raw = `${Crypto.randomUUID()}${Crypto.randomUUID()}`;
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
  return { raw, hashed };
}

/**
 * Whether Sign in with Apple can be offered: iOS 13+ with the capability in the build.
 * `null` until the native module has answered, so the login screen does not flash the
 * button in and out.
 */
export function useAppleSignInAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(Platform.OS === 'ios' ? null : false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let alive = true;
    AppleAuthentication.isAvailableAsync()
      .then((ok) => { if (alive) setAvailable(ok); })
      .catch(() => { if (alive) setAvailable(false); });
    return () => { alive = false; };
  }, []);
  return available;
}

/**
 * "Continue with Apple" (iOS only). Apple's own button, not a lookalike: the Human
 * Interface Guidelines ask for Apple's artwork and wording, and the native control
 * localises its title to the device language ("Continuar com a Apple" in Portuguese).
 * Black on the light theme, white on the dark one, the HIG's pairing for each.
 *
 * On success the root Gate redirects into the app, like the Google button.
 * Cancelling the Apple sheet is a silent no-op.
 */
export default function AppleSignInButton() {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const dispatch = useDispatch<AppDispatch>();
  const [busy, setBusy] = useState(false);

  const onPress = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const nonce = await makeNonce();
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: nonce.hashed,
      });
      if (!credential.identityToken) {
        getLogger().error('Sign in with Apple returned no identityToken');
        notify.error(t('AppleSignInFailed'));
        return;
      }
      const res = await dispatch(appleLogin({
        identityToken: credential.identityToken,
        nonce: nonce.raw,
        authorizationCode: credential.authorizationCode,
        givenName: credential.fullName?.givenName,
        familyName: credential.fullName?.familyName,
      }));
      if (appleLogin.rejected.match(res)) {
        notify.error(
          res.payload === 'EMAIL_NOT_VERIFIED'
            ? t('EmailNotVerifiedError')
            : res.payload === APPLE_ACCOUNT_ALREADY_LINKED
              ? t('AppleAccountAlreadyLinked')
              : res.payload === RATE_LIMIT_ERROR_KEY
                ? t(RATE_LIMIT_ERROR_KEY)
                : t('AppleSignInFailed'));
      }
    } catch (e) {
      if ((e as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
      getLogger().error('Sign in with Apple failed', e);
      notify.error(t('AppleSignInFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (busy) {
    return (
      <View
        testID="apple-signin-busy"
        style={{ height: BUTTON_HEIGHT }}
        className="w-full items-center justify-center"
      >
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  return (
    <AppleAuthentication.AppleAuthenticationButton
      testID="apple-signin-button"
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={
        theme.base === 'dark'
          ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
          : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
      }
      cornerRadius={CORNER_RADIUS}
      style={{ width: '100%', height: BUTTON_HEIGHT }}
      onPress={onPress}
    />
  );
}
