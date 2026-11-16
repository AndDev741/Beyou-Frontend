import type { ConfigContext, ExpoConfig } from 'expo/config';
import { withEntitlementsPlist, type ConfigPlugin } from 'expo/config-plugins';

/**
 * app.json stays the source of truth; this only adds what app.json cannot say.
 *
 * 1. Google sign-in on iOS needs the iOS OAuth client's REVERSED id registered as a URL
 *    scheme (com.googleusercontent.apps.<id>), which Google's native SDK answers on after
 *    the browser step. It comes from EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, the same value
 *    `src/auth/googleSession.ts` passes to GoogleSignin.configure as iosClientId. Without
 *    it the plugin is left exactly as app.json has it (no URL scheme) and the iOS login
 *    screen shows no Google button: see `isGoogleSignInAvailable`.
 *
 * 2. expo-notifications writes the `aps-environment` entitlement on every iOS build. The
 *    app only schedules LOCAL notifications (the Pomodoro's end), which need no
 *    entitlement, and keeping it would make the App ID need the Push Notifications
 *    capability for nothing. Removed here; delete this when remote push arrives.
 *
 * Neither touches Android, so the Play release workflow builds what it always did.
 */
const GOOGLE_PLUGIN = '@react-native-google-signin/google-signin';

export function reversedClientId(clientId: string): string {
  // "1234-abc.apps.googleusercontent.com" -> "com.googleusercontent.apps.1234-abc"
  return clientId.trim().split('.').reverse().join('.');
}

export const withoutPushEntitlement: ConfigPlugin = (config) =>
  withEntitlementsPlist(config, (c) => {
    delete c.modResults['aps-environment'];
    return c;
  });

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const plugins = (config.plugins ?? []).map((plugin) =>
    iosClientId && plugin === GOOGLE_PLUGIN
      ? [GOOGLE_PLUGIN, { iosUrlScheme: reversedClientId(iosClientId) }]
      : plugin,
  ) as NonNullable<ExpoConfig['plugins']>;
  return withoutPushEntitlement({ ...(config as ExpoConfig), plugins });
};
