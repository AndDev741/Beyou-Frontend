jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import SnapshotHistory from '../src/ui/routines/SnapshotHistory';

const snap = (date: string) => ({ id: 'sn-' + date, snapshotDate: date, routineName: 'M', routineIconId: '', completed: false,
  structure: { sections: [{ name: 'Wake', iconId: '', orderIndex: 0, startTime: '06:00', endTime: null,
    items: [{ type: 'HABIT', groupId: 'g1', itemId: 'h1', name: 'Meditate', iconId: '', startTime: '06:00', endTime: null }] }] },
  checks: [{ id: 'chk1', itemType: 'HABIT', itemName: 'Meditate', itemIconId: '', sectionName: 'Wake', originalGroupId: 'g1', difficulty: 1, importance: 1, checked: false, skipped: false, checkTime: null, xpGenerated: 0 }] });

test('selecting a day fetches + renders its snapshot', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const get = jest.fn(async (url: string) =>
    url.includes('/snapshots?month=') ? { data: { dates: [] } } : { data: snap(today) });
  setHttpClient({ get, post: get, put: get, delete: get } as never);
  setLogger({ error: () => {} });
  await render(
    <Provider store={makeStore()}><BeyouThemeProvider><SnapshotHistory routineId="r1" /></BeyouThemeProvider></Provider>,
  );
  // press the most recent day chip (testID day-chip-0 = today)
  await act(async () => { fireEvent.press(screen.getByTestId('day-chip-0')); });
  await waitFor(() => expect(screen.getByTestId('snapshot-card')).toBeTruthy());
});
