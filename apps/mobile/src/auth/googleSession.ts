import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getLogger } from '@beyou/api';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// The native lib matches the Android OAuth client by package + signing SHA-1; only
// the WEB client id is passed here, so the returned ID token's audience is the web
// client — which the backend's GOOGLE_MOBILE_AUDIENCES accepts. configure() is
// idempotent and safe to run at module load (EXPO_PUBLIC_* is inlined at build).
//
// It lives here rather than in the button because the logout thunk clears the Google
// session too, and that path never renders the button. Configuring from the auth layer
// means both callers get a configured client without depending on which screens the
// router happened to require first.
if (!WEB_CLIENT_ID) {
  // Missing here means EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID wasn't inlined at bundle
  // time → signIn() will return a null idToken and the flow can't complete. Most
  // often: .env not present, or Metro not restarted with `expo start -c`.
  getLogger().error('googleSession: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set');
}
GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });

/**
 * Forgets the Google account this device has cached, so the next sign-in asks who is
 * signing in instead of answering by itself.
 *
 * Android runs the legacy Google Sign-In API, where `getSignInIntent()` resolves
 * straight to whatever `GoogleSignIn.getLastSignedInAccount()` holds and never draws
 * the account picker. Nothing expires that entry. It is written on the first sign-in
 * and read on every one after, so someone with a second Google account on the same
 * phone could not reach it, and the workaround people found was wiping the app's
 * storage — which happens to be where that entry lives. `signOut()` clears it.
 *
 * Deliberately not `revokeAccess()`: that drops the OAuth grant as well and drags the
 * user back through the consent screen for scopes they already approved. What we want
 * back is the question, not the consent.
 *
 * A failure here is swallowed. Worst case is the behaviour we already had, one account
 * remembered forever, and that is not worth failing a sign-in or stranding a logout
 * over. One way it can fail: `signOut()` does not await the native `configure()` the
 * way `signIn()` does, so a call in the first milliseconds after boot can hit a null
 * client.
 */
export async function clearGoogleSession(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch (e) {
    getLogger().error('Google sign-out failed; the cached account may survive', e);
  }
}
