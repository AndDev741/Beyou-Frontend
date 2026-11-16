import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import AppleSignInButton, { useAppleSignInAvailable } from '../AppleSignInButton';
import GoogleSignInButton from '../GoogleSignInButton';
import { isGoogleSignInAvailable } from '../../auth/googleSession';

/**
 * The sign-in alternatives under the login and register forms: a divider, then
 * "Continue with Apple" (iOS) above "Continue with Google".
 *
 * Apple first and the same size as Google, because App Store guideline 4.8 and the HIG
 * ask for Sign in with Apple to be offered at least as prominently as any other
 * third-party sign-in. Google is left out of a build that cannot complete it (iOS
 * without its OAuth client id, see `isGoogleSignInAvailable`), and the whole block
 * disappears when neither applies, so the divider never introduces nothing.
 */
export default function SocialSignIn() {
  const { t } = useTranslation();
  const apple = useAppleSignInAvailable();
  const google = isGoogleSignInAvailable();

  // `null` = still asking the native module; keep the space quiet rather than jumping.
  if (!google && !apple) return null;

  return (
    <View className="mt-5 w-full" testID="social-sign-in">
      {/* A divider before the alternatives: they are the second option, not a visual
          pair for "Sign in". It ships with the buttons because it does on the web too. */}
      <View className="mb-4 flex-row items-center gap-3">
        <View className="h-px flex-1 bg-border" />
        <Text className="text-xs text-text-3">{t('Or')}</Text>
        <View className="h-px flex-1 bg-border" />
      </View>

      <View className="gap-3">
        {apple ? <AppleSignInButton /> : null}
        {google ? <GoogleSignInButton /> : null}
      </View>
    </View>
  );
}
