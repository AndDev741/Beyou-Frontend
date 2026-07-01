jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => false }) }));
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import TutorialSection from '../src/ui/config/TutorialSection';

const wrap = (store = makeStore()) =>
  render(<Provider store={store}><BeyouThemeProvider><TutorialSection /></BeyouThemeProvider></Provider>);

test('replay resets completion + sets intro phase', async () => {
  const put = jest.fn(async () => ({ data: { success: true } }));
  setHttpClient({ get: async () => ({ data: null }), post: async () => ({ data: null }), put, delete: async () => ({ data: null }) } as never);
  setLogger({ error: () => {} });
  const store = makeStore();
  await wrap(store);
  await act(async () => { fireEvent.press(screen.getByTestId('tutorial-replay')); });
  await waitFor(() => expect(store.getState().tutorial.phase).toBe('intro'));
  expect(store.getState().perfil.isTutorialCompleted).toBe(false);
});
