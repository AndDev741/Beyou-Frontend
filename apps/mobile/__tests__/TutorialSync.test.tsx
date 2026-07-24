/**
 * TutorialSync boot gate — regression tests for two field bugs sharing one root:
 * - fresh install + new account never started the intro (the gate only fired on
 *   an isTutorialCompleted *transition*, which a fresh boot never produces);
 * - logout re-seeded 'intro' at the login screen (store reset flips
 *   isTutorialCompleted true->false), replaying the tutorial for old accounts.
 * The gate now waits for auth + a hydrated profile, and clears stale phases
 * for completed accounts.
 */
import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { makeStore } from '../src/store';
import TutorialSync from '../src/tutorial/TutorialSync';
import { setPhase } from '../src/tutorial/tutorialSlice';
import { login } from '../src/auth/authSlice';
import { hydratePerfil, tutorialCompletedEnter } from '@beyou/state/user/perfilSlice';

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
    __store: m,
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const secure = require('expo-secure-store') as { __store: Map<string, string> };

const KEY = 'beyou.tutorial.phase';

const mount = async (store: ReturnType<typeof makeStore>) => {
  await render(
    <Provider store={store}>
      <TutorialSync />
    </Provider>,
  );
};

const signIn = async (store: ReturnType<typeof makeStore>, isTutorialCompleted: boolean) => {
  await act(async () => {
    store.dispatch(login.fulfilled({} as never, 'test', { email: 'a@a.com', password: 'x' } as never));
    store.dispatch(hydratePerfil({ email: 'a@a.com' } as never));
    store.dispatch(tutorialCompletedEnter(isTutorialCompleted));
  });
};

describe('TutorialSync boot gate', () => {
  beforeEach(() => {
    secure.__store.clear();
  });

  test('fresh install + new account: intro starts once auth + profile arrive', async () => {
    const store = makeStore();
    await mount(store);

    expect(store.getState().tutorial.phase).toBeNull(); // not before login

    await signIn(store, false);

    await waitFor(() => expect(store.getState().tutorial.phase).toBe('intro'));
  });

  test('logged out: gate never fires even though isTutorialCompleted is false', async () => {
    const store = makeStore();
    await mount(store);

    expect(store.getState().tutorial.phase).toBeNull();
    expect(secure.__store.get(KEY)).toBeUndefined();
  });

  test('completed account clears a stale persisted phase instead of replaying', async () => {
    secure.__store.set(KEY, 'intro'); // seeded by the old logout bug
    const store = makeStore();
    await mount(store);

    await waitFor(() => expect(store.getState().tutorial.phase).toBe('intro'));

    await signIn(store, true);

    await waitFor(() => expect(store.getState().tutorial.phase).toBeNull());
    await waitFor(() => expect(secure.__store.get(KEY)).toBeUndefined());
  });

  test('mid-tutorial phase persists across restart for an uncompleted account', async () => {
    secure.__store.set(KEY, 'habits');
    const store = makeStore();
    await mount(store);
    await signIn(store, false);

    await waitFor(() => expect(store.getState().tutorial.phase).toBe('habits')); // resumes, not intro
  });

  test('phase changes are persisted after hydration', async () => {
    const store = makeStore();
    await mount(store);

    await act(async () => {
      store.dispatch(setPhase('dashboard'));
    });

    await waitFor(() => expect(secure.__store.get(KEY)).toBe('dashboard'));
  });
});
