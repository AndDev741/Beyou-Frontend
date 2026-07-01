jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import TutorialFinale from '../src/ui/tutorial/TutorialFinale';

const wrap = (store = makeStore()) =>
  render(<Provider store={store}><BeyouThemeProvider><TutorialFinale /></BeyouThemeProvider></Provider>);

beforeEach(() => {
  setHttpClient({ get: async () => ({ data: null }), post: async () => ({ data: null }), put: async () => ({ data: { success: true } }), delete: async () => ({ data: null }) } as never);
  setLogger({ error: () => {} });
});

test('shows the explore message when no routine is scheduled today', async () => {
  await wrap();
  expect(screen.getByText('Start exploring and create an awesome life!')).toBeTruthy();
});

test('shows the scheduled message when a routine is set for today', async () => {
  const store = makeStore();
  store.dispatch({ type: 'todayRoutine/enterTodayRoutine', payload: { id: 'r1', name: 'AM', routineSections: [] } });
  await wrap(store);
  expect(screen.getByText(/check items off as you go/i)).toBeTruthy();
});

test('the done button completes the tutorial', async () => {
  const store = makeStore();
  store.dispatch({ type: 'tutorial/setPhase', payload: 'done' });
  await wrap(store);
  await act(async () => { fireEvent.press(screen.getByTestId('tutorial-finale-done')); });
  await waitFor(() => expect(store.getState().tutorial.phase).toBeNull());
  expect(store.getState().perfil.isTutorialCompleted).toBe(true);
});
