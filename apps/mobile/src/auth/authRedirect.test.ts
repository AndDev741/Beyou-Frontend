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
});
