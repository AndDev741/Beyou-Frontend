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
import { useCategoriesTutorial } from '../src/tutorial/hooks/useCategoriesTutorial';

const wrapper = (store: ReturnType<typeof makeStore>) => ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;

test('create-category step is disabled until a category exists', async () => {
  const store = makeStore();
  store.dispatch({ type: 'tutorial/setPhase', payload: 'categories' });
  const { result, rerender } = await renderHook(() => useCategoriesTutorial(), { wrapper: wrapper(store) });
  expect(result.current.steps[0].disabled).toBe(true);
  await act(async () => { store.dispatch({ type: 'categories/enterCategories', payload: [{ id: 'c1', name: 'Health', iconId: 'x' }] }); });
  rerender({});
  expect(result.current.steps[0].disabled).toBe(false);
});

test('finishing transitions to habits', async () => {
  const store = makeStore();
  store.dispatch({ type: 'tutorial/setPhase', payload: 'categories' });
  store.dispatch({ type: 'categories/enterCategories', payload: [{ id: 'c1', name: 'Health', iconId: 'x' }] });
  const { result } = await renderHook(() => useCategoriesTutorial(), { wrapper: wrapper(store) });
  for (let i = 0; i < result.current.steps.length; i++) {
    await act(async () => { result.current.next(); });
  }
  expect(store.getState().tutorial.phase).toBe('habits');
});
