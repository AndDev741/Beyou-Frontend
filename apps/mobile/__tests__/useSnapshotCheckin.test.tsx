jest.mock('../src/notify', () => ({ notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

import React from 'react';
import { Provider } from 'react-redux';
import { renderHook, act } from '@testing-library/react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { makeStore } from '../src/store';
import { useSnapshotCheckin } from '../src/ui/routines/useSnapshotCheckin';

const snapshot = { id: 'sn1', snapshotDate: '2026-06-10', routineName: 'M', routineIconId: '', completed: false, structure: { sections: [] }, checks: [] };

test('check posts to /routine/snapshot/check then refetches the snapshot', async () => {
  const post = jest.fn(async () => ({ data: { success: { /* RefreshUI */ } } }));
  const get = jest.fn(async () => ({ data: { ...snapshot, completed: true } }));
  setHttpClient({ get, post, put: get, delete: get } as never);
  setLogger({ error: () => {} });
  const store = makeStore();
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result } = await renderHook(() => useSnapshotCheckin('r1'), { wrapper });
  await act(async () => { await result.current.check(snapshot as never, 'chk1'); });
  expect(post).toHaveBeenCalledWith('/routine/snapshot/check', { snapshotId: 'sn1', snapshotCheckId: 'chk1' });
  expect(get).toHaveBeenCalledWith(
    '/routine/r1/snapshot',
    { params: { date: '2026-06-10' } },
  );
  expect(store.getState().snapshot.snapshots['sn1'].completed).toBe(true);
});
