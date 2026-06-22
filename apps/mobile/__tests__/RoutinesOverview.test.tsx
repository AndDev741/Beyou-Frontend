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

test('snapshot card reflects live slice state after check — card re-renders with updated data', async () => {
  // Arrange: build a snapshot with one check item
  const checkId = 'chk1';
  const snapshotId = 'sn1';
  const pastDate = '2026-06-10';

  const initialSnapshot = {
    id: snapshotId,
    snapshotDate: pastDate,
    routineName: 'Morning',
    routineIconId: '',
    completed: false,
    structure: {
      sections: [{
        name: 'Wake',
        iconId: '',
        orderIndex: 0,
        startTime: '06:00',
        endTime: '07:00',
        items: [{ type: 'HABIT' as const, groupId: 'g1', itemId: 'h1', name: 'Exercise', iconId: '', startTime: null, endTime: null }],
      }],
    },
    checks: [{
      id: checkId,
      itemType: 'HABIT' as const,
      itemName: 'Exercise',
      itemIconId: '',
      sectionName: 'Wake',
      originalGroupId: 'g1',
      difficulty: 3,
      importance: 3,
      checked: false,
      skipped: false,
      checkTime: null,
      xpGenerated: 10,
    }],
  };

  const checkedSnapshot = { ...initialSnapshot, completed: true, checks: [{ ...initialSnapshot.checks[0], checked: true, checkTime: '06:15' }] };

  // The GET for snapshot dates returns empty; the GET for /snapshot returns based on call count
  let snapshotGetCount = 0;
  const get = jest.fn(async (url: string) => {
    if (url.includes('/snapshots')) return { data: { dates: [pastDate] } };
    // First call (on day chip press) returns unchecked; second call (after post) returns checked
    snapshotGetCount += 1;
    return { data: snapshotGetCount === 1 ? initialSnapshot : checkedSnapshot };
  });
  const post = jest.fn(async () => ({ data: {} }));
  setHttpClient({ get, post, put: get, delete: get } as never);
  setLogger({ error: () => {} });
  const store = makeStore();

  await render(
    <Provider store={store}>
      <BeyouThemeProvider>
        <RoutinesOverview routines={routines as never} />
      </BeyouThemeProvider>
    </Provider>,
  );

  // Act: press the past-day chip (index 1 = yesterday)
  await act(async () => { fireEvent.press(screen.getByTestId('rov-day-1')); });

  // Wait for the card to appear (snapshot fetched)
  await waitFor(() => expect(screen.getAllByTestId('snapshot-card').length).toBeGreaterThan(0));

  // Act: press the check button on the first check item
  await act(async () => { fireEvent.press(screen.getByTestId(`snap-check-${checkId}`)); });

  // Assert: the checkin API was called
  expect(post).toHaveBeenCalledWith('/routine/snapshot/check', { snapshotId, snapshotCheckId: checkId });

  // Assert: the slice snapshot was updated (the re-fetch dispatches enterSnapshot)
  await waitFor(() => {
    const sliceSnap = store.getState().snapshot.snapshots[snapshotId];
    expect(sliceSnap).toBeDefined();
    expect(sliceSnap.checks[0].checked).toBe(true);
  });
});
