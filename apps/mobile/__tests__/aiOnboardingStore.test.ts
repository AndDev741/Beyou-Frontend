/**
 * aiOnboardingStore (AI onboarding — Task 2) — SecureStore twin of the web
 * aiOnboardingStorage. Ports the 7 web storage cases as async: round-trip,
 * empty, corrupt JSON, unknown step, past-categories-without-categories,
 * malformed refs, clear.
 */
jest.mock('expo-secure-store', () => {
  const m = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => m.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => {
      m.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k: string) => {
      m.delete(k);
    }),
  };
});

import * as SecureStore from 'expo-secure-store';
import {
  clearWizardProgress,
  loadWizardProgress,
  saveWizardProgress,
  type StoredWizardProgress,
} from '../src/lib/aiOnboardingStore';

const KEY = 'beyou.aiOnboarding.progress';

const progress: StoredWizardProgress = {
  step: 'habitsTasks',
  data: {
    categories: [{ id: 'c-1', name: 'Health' }],
    habits: [],
    tasks: [],
    goals: [],
    freeTexts: ['something calm'],
  },
};

describe('aiOnboardingStore', () => {
  beforeEach(async () => {
    await SecureStore.deleteItemAsync(KEY);
  });

  it('round-trips progress', async () => {
    await saveWizardProgress(progress);
    expect(await loadWizardProgress()).toEqual(progress);
  });

  it('returns null when nothing stored', async () => {
    expect(await loadWizardProgress()).toBeNull();
  });

  it('rejects corrupted JSON', async () => {
    await SecureStore.setItemAsync(KEY, '{not json');
    expect(await loadWizardProgress()).toBeNull();
  });

  it('rejects an unknown step', async () => {
    await SecureStore.setItemAsync(KEY, JSON.stringify({ ...progress, step: 'teleport' }));
    expect(await loadWizardProgress()).toBeNull();
  });

  it('rejects a past-categories step with no created categories', async () => {
    await SecureStore.setItemAsync(
      KEY,
      JSON.stringify({ ...progress, data: { ...progress.data, categories: [] } })
    );
    expect(await loadWizardProgress()).toBeNull();
  });

  it('rejects malformed refs', async () => {
    await SecureStore.setItemAsync(
      KEY,
      JSON.stringify({ ...progress, data: { ...progress.data, habits: [{ id: 42 }] } })
    );
    expect(await loadWizardProgress()).toBeNull();
  });

  it('clear removes stored progress', async () => {
    await saveWizardProgress(progress);
    await clearWizardProgress();
    expect(await loadWizardProgress()).toBeNull();
  });
});
