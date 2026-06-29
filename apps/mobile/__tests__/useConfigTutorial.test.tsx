jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
import { renderHook, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { setHttpClient, setLogger } from '@beyou/api';
import { makeStore } from '../src/store';
import { useConfigTutorial } from '../src/tutorial/hooks/useConfigTutorial';

test('finalizes the tutorial when phase=config', async () => {
  setHttpClient({ get: async () => ({ data: null }), post: async () => ({ data: null }), put: async () => ({ data: { success: true } }), delete: async () => ({ data: null }) } as never);
  setLogger({ error: () => {} });
  const store = makeStore();
  store.dispatch({ type: 'tutorial/setPhase', payload: 'config' });
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  renderHook(() => useConfigTutorial(), { wrapper });
  await waitFor(() => expect(store.getState().tutorial.phase).toBeNull());
  expect(store.getState().perfil.isTutorialCompleted).toBe(true);
});
