jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import RoutinesOverview from '../src/ui/routines/RoutinesOverview';

const routines = [{ id: 'r1', name: 'Morning', iconId: '', routineSections: [
  { id: 's1', name: 'Wake', iconId: '', startTime: '06:00', endTime: '07:00', order: 0,
    habitGroup: [{ id: 'g1', habitId: 'h1', startTime: '06:10', habitGroupChecks: [] }], taskGroup: [] }] }];

test('renders insight cards and selecting a past day fetches snapshots', async () => {
  const get = jest.fn(async (url: string) => (url.includes('/snapshots?month=') ? { data: { dates: [] } } : { data: { id: 'sn1', snapshotDate: 'x', routineName: 'Morning', routineIconId: '', completed: false, structure: { sections: [] }, checks: [] } }));
  setHttpClient({ get, post: get, put: get, delete: get } as never);
  setLogger({ error: () => {} });
  const store = makeStore();
  await render(<Provider store={store}><BeyouThemeProvider><RoutinesOverview routines={routines as never} /></BeyouThemeProvider></Provider>);
  expect(screen.getByText('Routines')).toBeTruthy(); // an insight label
  await act(async () => { fireEvent.press(screen.getByTestId('rov-day-1')); }); // a past day chip
  await waitFor(() => expect(get).toHaveBeenCalledWith(expect.stringContaining('/routine/r1/snapshot'), expect.anything()));
});
