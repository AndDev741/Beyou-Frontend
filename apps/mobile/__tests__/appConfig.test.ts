/**
 * app.config.ts only ever ADDS the Google iOS URL scheme. With no iOS client id the
 * plugin list must come out exactly as app.json wrote it, because the Android release
 * workflow builds from it and does not set the variable.
 */
import appConfig, { reversedClientId } from '../app.config';

const base = {
  name: 'Beyou',
  slug: 'beyou-mobile',
  plugins: ['expo-secure-store', '@react-native-google-signin/google-signin', ['expo-image-picker', {}]],
} as never;

afterEach(() => {
  delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
});

it('reverses the client id into the scheme Google returns to', () => {
  expect(reversedClientId('1234-abc.apps.googleusercontent.com')).toBe('com.googleusercontent.apps.1234-abc');
});

it('leaves the plugins untouched without an iOS client id', () => {
  expect(appConfig({ config: base } as never).plugins).toEqual((base as { plugins: unknown }).plugins);
});

it('gives the Google plugin its iosUrlScheme when the iOS client id is set', () => {
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = '1234-abc.apps.googleusercontent.com';

  const out = appConfig({ config: base } as never);

  expect(out.plugins).toEqual([
    'expo-secure-store',
    ['@react-native-google-signin/google-signin', { iosUrlScheme: 'com.googleusercontent.apps.1234-abc' }],
    ['expo-image-picker', {}],
  ]);
});
