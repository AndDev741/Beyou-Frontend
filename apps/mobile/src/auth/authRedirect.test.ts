import { nextAuthRoute } from './authRedirect';

describe('nextAuthRoute', () => {
  it('returns null while the auth status is still loading', () => {
    expect(nextAuthRoute('loading', [])).toBeNull();
    expect(nextAuthRoute('loading', ['(auth)'])).toBeNull();
    expect(nextAuthRoute('loading', ['(app)'])).toBeNull();
  });

  it('does NOT redirect an authenticated user already on the dashboard (root → (app)/index)', () => {
    // Expo Router serves `/` from (app)/index.tsx, and useSegments() returns
    // ['(app)'] there — the user is already on the dashboard, so no redirect.
    expect(nextAuthRoute('authenticated', ['(app)'])).toBeNull();
  });

  it('sends an authenticated user out of the (auth) group into the app', () => {
    expect(nextAuthRoute('authenticated', ['(auth)'])).toBe('/(app)');
  });

  it('sends an unauthenticated user sitting in the app to login', () => {
    expect(nextAuthRoute('unauthenticated', ['(app)'])).toBe('/(auth)/login');
  });

  it('does NOT redirect an unauthenticated user already in the (auth) group (no loop)', () => {
    expect(nextAuthRoute('unauthenticated', ['(auth)'])).toBeNull();
  });

  describe('the AI question', () => {
    it('sends a signed-in person who was never asked to the consent screen first', () => {
      expect(nextAuthRoute('authenticated', ['(auth)'], 'UNASKED')).toBe('/ai-consent');
      expect(nextAuthRoute('authenticated', ['(app)'], 'UNASKED')).toBe('/ai-consent');
    });

    it('leaves them on the consent screen while they read it', () => {
      expect(nextAuthRoute('authenticated', ['ai-consent'], 'UNASKED')).toBeNull();
    });

    it('lets an answered account reach the consent screen again to change its answer', () => {
      expect(nextAuthRoute('authenticated', ['ai-consent'], 'DECLINED')).toBeNull();
      expect(nextAuthRoute('authenticated', ['ai-consent'], 'GRANTED')).toBeNull();
    });

    it('asks nothing when the answer is in, or when the backend does not know the field', () => {
      expect(nextAuthRoute('authenticated', ['(app)'], 'GRANTED')).toBeNull();
      expect(nextAuthRoute('authenticated', ['(app)'], 'DECLINED')).toBeNull();
      expect(nextAuthRoute('authenticated', ['(app)'], undefined)).toBeNull();
    });

    it('never asks a signed-out person', () => {
      expect(nextAuthRoute('unauthenticated', ['ai-consent'], 'UNASKED')).toBe('/(auth)/login');
    });
  });
});
