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
import { useHabitsTutorial } from '../src/tutorial/hooks/useHabitsTutorial';

const wrapper = (store: ReturnType<typeof makeStore>) => ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;

test('create-habit step is disabled until a habit exists', async () => {
  const store = makeStore();
  store.dispatch({ type: 'tutorial/setPhase', payload: 'habits' });
  const { result, rerender } = await renderHook(() => useHabitsTutorial(), { wrapper: wrapper(store) });
  expect(result.current.steps[0].disabled).toBe(true);
  await act(async () => { store.dispatch({ type: 'habits/enterHabits', payload: [{ id: 'h1', name: 'Read', iconId: 'x' }] }); });
  rerender({});
  expect(result.current.steps[0].disabled).toBe(false);
});

test('finishing transitions to routines', async () => {
  const store = makeStore();
  store.dispatch({ type: 'tutorial/setPhase', payload: 'habits' });
  store.dispatch({ type: 'habits/enterHabits', payload: [{ id: 'h1', name: 'Read', iconId: 'x' }] });
  const { result } = await renderHook(() => useHabitsTutorial(), { wrapper: wrapper(store) });
  for (let i = 0; i < result.current.steps.length; i++) {
    await act(async () => { result.current.next(); });
  }
  expect(store.getState().tutorial.phase).toBe('routines');
});
