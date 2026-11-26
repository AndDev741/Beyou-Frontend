const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
}));

const mockSetAiConsent = jest.fn();
jest.mock('@beyou/api/user/setAiConsent', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockSetAiConsent(...args),
}));

import { resolveAiConsent } from './resolveAiConsent';
import { sendsToAiProvider } from './aiRoutes';
import type { Profile } from '../auth/types';

const profile = (aiConsent?: Profile['aiConsent']) => ({ id: 'u1', name: 'Ana', aiConsent }) as Profile;

describe('resolveAiConsent', () => {
  beforeEach(() => {
    mockStore.clear();
    jest.clearAllMocks();
  });

  it("takes the server's answer and keeps a copy on the device", async () => {
    const out = await resolveAiConsent(profile('DECLINED'));
    expect(out.aiConsent).toBe('DECLINED');
    expect(out.aiConsentOnDevice).toBeUndefined();
    expect(mockStore.get('beyou.aiConsent.u1')).toBe('DECLINED');
  });

  it('asks a backend that does not know the field nothing, and keeps the answer on the device', async () => {
    const fresh = await resolveAiConsent(profile(undefined));
    expect(fresh).toMatchObject({ aiConsent: 'UNASKED', aiConsentOnDevice: true });

    mockStore.set('beyou.aiConsent.u1', 'GRANTED');
    const answered = await resolveAiConsent(profile(undefined));
    expect(answered).toMatchObject({ aiConsent: 'GRANTED', aiConsentOnDevice: true });
    expect(mockSetAiConsent).not.toHaveBeenCalled();
  });

  it('hands an answer given on the device to a server that now stores it', async () => {
    mockStore.set('beyou.aiConsent.u1', 'DECLINED');
    mockSetAiConsent.mockResolvedValue({ data: { aiConsent: 'DECLINED' } });

    const out = await resolveAiConsent(profile('UNASKED'));

    expect(mockSetAiConsent).toHaveBeenCalledWith(false, { onlyIfUnasked: true });
    expect(out.aiConsent).toBe('DECLINED');
  });

  it('hands it over only to an account nobody answered for, and takes the answer that holds', async () => {
    mockStore.set('beyou.aiConsent.u1', 'GRANTED');
    mockSetAiConsent.mockResolvedValue({ data: { aiConsent: 'DECLINED' } });

    const out = await resolveAiConsent(profile('UNASKED'));

    expect(mockSetAiConsent).toHaveBeenCalledWith(true, { onlyIfUnasked: true });
    expect(out.aiConsent).toBe('DECLINED');
    expect(mockStore.get('beyou.aiConsent.u1')).toBe('DECLINED');
  });

  it('keeps a no from this device when the hand-over fails', async () => {
    mockStore.set('beyou.aiConsent.u1', 'DECLINED');
    mockSetAiConsent.mockResolvedValue({ error: { errorKey: 'UnexpectedError' } });

    const out = await resolveAiConsent(profile('UNASKED'));

    expect(out.aiConsent).toBe('DECLINED');
  });

  it('asks again when the hand-over fails, rather than guessing', async () => {
    mockStore.set('beyou.aiConsent.u1', 'GRANTED');
    mockSetAiConsent.mockResolvedValue({ error: { errorKey: 'UnexpectedError' } });

    const out = await resolveAiConsent(profile('UNASKED'));

    expect(out.aiConsent).toBe('UNASKED');
  });
});

describe('sendsToAiProvider', () => {
  it.each([
    ['POST', '/ai/agent/chats/1/stream'],
    ['POST', '/onboarding/suggestions'],
    ['POST', '/notebook/ai/pages/1/chat'],
    ['POST', '/notebook/pages/1/sources/link'],
    ['POST', '/second-brain/questions/refill'],
    ['POST', '/second-brain/questions/9/answer'],
    ['POST', '/second-brain/insight/refresh'],
  ])('%s %s reaches the provider', (method, path) => {
    expect(sendsToAiProvider(method, path)).toBe(true);
  });

  it.each([
    ['GET', '/ai/agent/chats'],
    ['POST', '/ai/agent/chats'],
    ['GET', '/daily-briefing'],
    ['POST', '/second-brain/questions/9/skip'],
    ['POST', '/habit'],
  ])('%s %s stays in Beyou', (method, path) => {
    expect(sendsToAiProvider(method, path)).toBe(false);
  });
});
