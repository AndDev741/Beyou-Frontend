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
  const { result } = await renderHook(() => useRoutinesTutorial(), { wrapper: wrapper(store) });
  expect(result.current.active).toBe(false);
});

test('the add step is disabled until a routine exists', async () => {
  const store = makeStore();
  store.dispatch({ type: 'tutorial/setPhase', payload: 'routines' });
  const { result } = await renderHook(() => useRoutinesTutorial(), { wrapper: wrapper(store) });
  const addStep = result.current.steps.find((s) => s.id === 'add');
  expect(addStep?.disabled).toBe(true);
});

test('auto-advances to schedule once a routine exists, then finishes into config', async () => {
  const store = makeStore();
  store.dispatch({ type: 'tutorial/setPhase', payload: 'routines' });
  const { result } = await renderHook(() => useRoutinesTutorial(), { wrapper: wrapper(store) });
  expect(result.current.active).toBe(true);
  expect(result.current.stepIndex).toBe(0);

  // Creating a routine auto-advances past the (hidden-behind-builder) add step.
  await act(async () => {
    store.dispatch({ type: 'routines/enterRoutines', payload: [{ id: 'r1', name: 'AM', routineSections: [] }] });
  });
  expect(result.current.stepIndex).toBe(1);

  await act(async () => { result.current.next(); });
  expect(store.getState().tutorial.phase).toBe('config');
});
