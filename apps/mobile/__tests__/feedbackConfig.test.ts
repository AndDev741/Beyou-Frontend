/**
 * feedbackConfig (#30) — the `mailto:` address is R7's escape hatch: the way a
 * report reaches a human when the API cannot take it. It documented itself as
 * overridable, but nothing in the repo sets the value it read, so every build
 * resolved to the hard-coded literal. The override has to be a mechanism the
 * build actually uses.
 */
const ORIGINAL = process.env.EXPO_PUBLIC_FEEDBACK_EMAIL;

const loadConfig = () => {
  let loaded: typeof import('../src/ui/feedback/feedbackConfig');
  jest.isolateModules(() => {
    loaded = require('../src/ui/feedback/feedbackConfig');
  });
  return loaded!;
};

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.EXPO_PUBLIC_FEEDBACK_EMAIL;
  else process.env.EXPO_PUBLIC_FEEDBACK_EMAIL = ORIGINAL;
});

describe('FEEDBACK_EMAIL', () => {
  it('is whatever the build configured', () => {
    process.env.EXPO_PUBLIC_FEEDBACK_EMAIL = 'ops@example.com';

    expect(loadConfig().FEEDBACK_EMAIL).toBe('ops@example.com');
  });

  it('treats a blank value as unset rather than as an empty address', () => {
    process.env.EXPO_PUBLIC_FEEDBACK_EMAIL = '   ';

    expect(loadConfig().FEEDBACK_EMAIL).toBe('support@beyou.app');
  });

  it('falls back to the documented default when the build sets nothing', () => {
    delete process.env.EXPO_PUBLIC_FEEDBACK_EMAIL;

    expect(loadConfig().FEEDBACK_EMAIL).toBe('support@beyou.app');
  });
});
