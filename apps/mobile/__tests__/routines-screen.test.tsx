/**
 * Routines screen (P7 PR1) — self-fetches routines + habits + tasks, renders cards,
 * shows empty state when none. Boundary mocked = @beyou/api HttpClient + expo-router + notify.
 */
jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
}));

import { Provider } from 'react-redux';
import { render, screen, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import RoutinesScreen from '../app/(app)/routines';

const routine = { id: 'r1', name: 'Morning', iconId: 'lucide:sun', routineSections: [] };

function setHttp(routines: unknown[]) {
  const get = async (url: string) => (url === '/routine' ? { data: routines } : { data: [] });
  setHttpClient({ get, post: get, put: get, delete: get } as never);
  setLogger({ error: () => {} });
}
const renderScreen = () =>
  render(<Provider store={makeStore()}><BeyouThemeProvider><RoutinesScreen /></BeyouThemeProvider></Provider>);

test('lists fetched routines', async () => {
  setHttp([routine]);
  await renderScreen();
  await waitFor(() => expect(screen.getByTestId('routine-card-r1')).toBeTruthy());
});

test('shows the empty state', async () => {
  setHttp([]);
  await renderScreen();
  await waitFor(() => expect(screen.getByText('No routines yet')).toBeTruthy());
});
