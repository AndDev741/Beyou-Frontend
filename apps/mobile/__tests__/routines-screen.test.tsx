/**
 * Routines screen (P7 PR1 + PR3) — self-fetches routines + habits + tasks, renders cards,
 * shows empty state when none. Boundary mocked = @beyou/api HttpClient + expo-router + notify.
 */
jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
}));

import { Provider } from 'react-redux';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import RoutinesScreen from '../app/(app)/routines';

const routine = { id: 'r1', name: 'Morning', iconId: 'lucide:sun', routineSections: [] };

function setHttp(routines: unknown[]) {
  const get = async (url: string) => {
    if (url === '/routine') return { data: routines };
    if (url === '/schedule') return { data: [] };
    return { data: [] };
  };
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

test('the + button opens the builder', async () => {
  setHttp([]);
  await renderScreen();
  await waitFor(() => expect(screen.getByTestId('create-routine')).toBeTruthy());
  await act(async () => { fireEvent.press(screen.getByTestId('create-routine')); });
  expect(screen.getByTestId('routine-name')).toBeTruthy();
});

test('the AI button opens the AI sheet', async () => {
  setHttp([]);
  await renderScreen();
  await waitFor(() => expect(screen.getByTestId('ai-routine')).toBeTruthy());
  await act(async () => { fireEvent.press(screen.getByTestId('ai-routine')); });
  expect(screen.getByTestId('ai-description')).toBeTruthy();
});

test('today mode shows the sort pill + an expandable card', async () => {
  setHttp([routine]);
  await renderScreen();
  await waitFor(() => expect(screen.getByTestId('routine-card-r1')).toBeTruthy());
  expect(screen.getByTestId('routines-sort')).toBeTruthy();
});

function setHttpForSnapshots(routines: unknown[], date: string) {
  const snapshot = { id: 'sn1', snapshotDate: date, routineName: 'Morning', routineIconId: '', completed: false, structure: { sections: [{ name: 'Wake', iconId: '', orderIndex: 0, startTime: '06:00', endTime: null, items: [] }] }, checks: [] };
  const get = async (url: string, opts?: { params?: { month?: string; date?: string } }) => {
    if (url === '/routine') return { data: routines };
    if (url === '/schedule') return { data: [] };
    if (url.includes('/snapshots') && opts?.params?.month) return { data: { dates: [date] } };
    if (url.includes('/snapshot') && opts?.params?.date) return { data: snapshot };
    return { data: [] };
  };
  setHttpClient({ get, post: get, put: get, delete: get } as never);
  setLogger({ error: () => {} });
}

test('past day shows snapshot cards instead of routine cards', async () => {
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  setHttpForSnapshots([{ id: 'r1', name: 'Morning', iconId: '', routineSections: [] }], yesterday);
  await renderScreen();
  await waitFor(() => expect(screen.getByTestId('routine-card-r1')).toBeTruthy());
  await act(async () => { fireEvent.press(screen.getByTestId('rov-day-1')); }); // pick yesterday
  await waitFor(() => expect(screen.getByTestId('snapshot-card')).toBeTruthy());
  expect(screen.queryByTestId('routine-card-r1')).toBeNull();
});
