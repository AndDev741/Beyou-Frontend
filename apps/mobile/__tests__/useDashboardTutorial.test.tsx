jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('react-native-toast-message', () => {
  const S = () => null;
  (S as unknown as { show: unknown }).show = jest.fn();
  return { __esModule: true, default: S };
});
jest.mock('@beyou/api/user/editUser', () => ({ __esModule: true, default: jest.fn(async () => ({ success: true })) }));
import '../src/i18n';
import { renderHook, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { makeStore } from '../src/store';
import { useDashboardTutorial } from '../src/tutorial/hooks/useDashboardTutorial';

const wrapper = (store = makeStore()) => ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;

test('inactive unless phase is dashboard', async () => {
  const { result } = await renderHook(() => useDashboardTutorial(), { wrapper: wrapper() });
  expect(result.current.active).toBe(false);
});

test('advancing past the last step transitions to categories', async () => {
  const store = makeStore();
  store.dispatch({ type: 'tutorial/setPhase', payload: 'dashboard' });
  const { result } = await renderHook(() => useDashboardTutorial(), { wrapper: wrapper(store) });
  expect(result.current.active).toBe(true);
  // One next() per commit (real usage: one tap per render) so each call sees fresh stepIndex.
  for (let i = 0; i < result.current.steps.length; i++) {
    await act(async () => { result.current.next(); });
  }
  expect(store.getState().tutorial.phase).toBe('categories');
});
