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
import { useRoutinesTutorial } from '../src/tutorial/hooks/useRoutinesTutorial';

const wrapper = (store: ReturnType<typeof makeStore>) => ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;

test('active is false when phase is not routines', async () => {
  const store = makeStore();
  const { result } = await renderHook(() => useRoutinesTutorial({ builderOpen: false, hasSection: false }), { wrapper: wrapper(store) });
  expect(result.current.active).toBe(false);
});

test('routines walkthrough finishes into config', async () => {
  const store = makeStore();
  store.dispatch({ type: 'tutorial/setPhase', payload: 'routines' });
  store.dispatch({ type: 'routines/enterRoutines', payload: [{ id: 'r1', name: 'AM', routineSections: [] }] });
  const { result } = await renderHook(() => useRoutinesTutorial({ builderOpen: false, hasSection: true }), { wrapper: wrapper(store) });
  expect(result.current.active).toBe(true);
  for (let i = 0; i < result.current.steps.length; i++) {
    await act(async () => { result.current.next(); });
  }
  expect(store.getState().tutorial.phase).toBe('config');
});

test('section step is disabled when hasSection is false', async () => {
  const store = makeStore();
  store.dispatch({ type: 'tutorial/setPhase', payload: 'routines' });
  const { result } = await renderHook(() => useRoutinesTutorial({ builderOpen: false, hasSection: false }), { wrapper: wrapper(store) });
  const sectionStep = result.current.steps.find((s) => s.id === 'section');
  expect(sectionStep?.disabled).toBe(true);
});

test('save step is disabled when no routines exist', async () => {
  const store = makeStore();
  store.dispatch({ type: 'tutorial/setPhase', payload: 'routines' });
  const { result } = await renderHook(() => useRoutinesTutorial({ builderOpen: false, hasSection: true }), { wrapper: wrapper(store) });
  const saveStep = result.current.steps.find((s) => s.id === 'save');
  expect(saveStep?.disabled).toBe(true);
});
