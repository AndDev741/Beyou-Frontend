/**
 * mutations-fail-open.test.ts — Verify that isOffline() and offline ops
 * fail-open when the offline store is never configured. This proves that
 * an unconfigured offline layer acts as a transparent pass-through to the
 * network path (online behavior), rather than throwing.
 *
 * CRITICAL: This test NEVER calls setOfflineStore(). It validates the
 * boot-time contract: before `initOfflineSync` wires the store at app startup,
 * all mutations must gracefully delegate to the network.
 */

jest.mock('@beyou/api/habits/createHabit');

import { setLogger } from '@beyou/api';
import '../src/i18n';
import i18n from '../src/i18n';
import { createHabitOffline } from '../src/offline/ops/habitOps';
import { isOffline } from '../src/offline/mutations';
import createHabit from '@beyou/api/habits/createHabit';

const createHabitMock = jest.mocked(createHabit);

describe('mutations fail-open when offline store is not configured', () => {
  beforeEach(() => {
    setLogger({ error: () => {} });
    createHabitMock.mockClear();
    createHabitMock.mockResolvedValue({ success: true } as never);
  });

  it('isOffline() returns false when offlineStore is null (no throw)', () => {
    // The core contract: unconfigured offline layer counts as online.
    expect(isOffline()).toBe(false);
  });

  it('createHabitOffline delegates to the network when unconfigured', async () => {
    const t = i18n.t.bind(i18n);

    // Call the offline op with an unconfigured store.
    const result = await createHabitOffline(
      'Run',
      '',
      '',
      3,
      3,
      'lucide:zap',
      0,
      [],
      t,
    );

    // The result should come from the mocked API.
    expect(result).toEqual({ success: true });

    // The API should have been called once (not enqueued, because isOffline() = false).
    expect(createHabitMock).toHaveBeenCalledTimes(1);
  });
});
