jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn(), push: jest.fn() }) }));
import { renderHook, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { makeStore } from '../src/store';
import { useConfigTutorial } from '../src/tutorial/hooks/useConfigTutorial';

const wrapper = (store: ReturnType<typeof makeStore>) => ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;

test('active is false when phase is not config', async () => {
  const store = makeStore();
  const { result } = await renderHook(() => useConfigTutorial(), { wrapper: wrapper(store) });
  expect(result.current.active).toBe(false);
});

test('walking all section steps moves to the done phase', async () => {
  const store = makeStore();
  store.dispatch({ type: 'tutorial/setPhase', payload: 'config' });
  const { result } = await renderHook(() => useConfigTutorial(), { wrapper: wrapper(store) });
  expect(result.current.active).toBe(true);
  for (let i = 0; i < result.current.steps.length; i++) {
    await act(async () => { result.current.next(); });
  }
  expect(store.getState().tutorial.phase).toBe('done');
});
