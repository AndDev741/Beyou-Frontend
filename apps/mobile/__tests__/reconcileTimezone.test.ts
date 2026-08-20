import type { UserType } from '@beyou/types/user/UserType';

jest.mock('expo-localization', () => ({ getCalendars: jest.fn() }));
jest.mock('@beyou/api/user/editUser', () => ({ __esModule: true, default: jest.fn() }));

import { getCalendars } from 'expo-localization';
import editUser from '@beyou/api/user/editUser';
import { reconcileTimezone } from '../src/lib/reconcileTimezone';
import { detectTimezone } from '../src/lib/detectTimezone';

const getCalendarsMock = getCalendars as jest.Mock;
const editUserMock = editUser as unknown as jest.Mock;

/** A profile carrying only what the reconcile reads. */
function profile(overrides: Partial<UserType>): UserType {
  return { timezone: 'UTC', timezoneSource: 'DEFAULT', ...overrides } as UserType;
}

function deviceZone(zone: string | null) {
  if (zone === null) {
    getCalendarsMock.mockImplementation(() => { throw new Error('no localization'); });
    return;
  }
  getCalendarsMock.mockReturnValue([{ timeZone: zone }]);
}

describe('reconcileTimezone (mobile)', () => {
  let dispatch: jest.Mock;

  beforeEach(() => {
    dispatch = jest.fn();
    getCalendarsMock.mockReset();
    editUserMock.mockReset();
    editUserMock.mockResolvedValue({ data: {} });
  });

  it('adopts the device zone when the account never had one', async () => {
    deviceZone('Europe/Lisbon');

    await reconcileTimezone(dispatch, profile({ timezone: 'UTC', timezoneSource: 'DEFAULT' }));

    expect(editUserMock).toHaveBeenCalledWith({
      timezone: 'Europe/Lisbon',
      timezoneSource: 'DETECTED',
    });
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it('leaves a zone a person picked alone', async () => {
    deviceZone('Europe/Lisbon');

    await reconcileTimezone(dispatch, profile({ timezone: 'UTC', timezoneSource: 'EXPLICIT' }));

    expect(editUserMock).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('does not re-adopt over a zone a client already detected', async () => {
    // A phone taken abroad must not silently move the day boundary; the settings screen
    // offers it as a suggestion instead.
    deviceZone('America/Sao_Paulo');

    await reconcileTimezone(
      dispatch, profile({ timezone: 'Europe/Lisbon', timezoneSource: 'DETECTED' }));

    expect(editUserMock).not.toHaveBeenCalled();
  });

  it('stays quiet when the stored zone is already right', async () => {
    deviceZone('Europe/Lisbon');

    await reconcileTimezone(
      dispatch, profile({ timezone: 'Europe/Lisbon', timezoneSource: 'DEFAULT' }));

    expect(editUserMock).not.toHaveBeenCalled();
  });

  it('stays quiet when the device cannot report a zone', async () => {
    deviceZone(null);

    await reconcileTimezone(dispatch, profile({ timezoneSource: 'DEFAULT' }));

    expect(editUserMock).not.toHaveBeenCalled();
  });

  it('swallows a rejected edit and leaves the slice untouched', async () => {
    deviceZone('Europe/Lisbon');
    editUserMock.mockResolvedValue({ error: { errorKey: 'INVALID_REQUEST' } });

    await expect(
      reconcileTimezone(dispatch, profile({ timezoneSource: 'DEFAULT' }))
    ).resolves.toBeUndefined();

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('swallows a thrown edit too', async () => {
    // This runs while the dashboard is loading. It must never be the reason that fails.
    deviceZone('Europe/Lisbon');
    editUserMock.mockRejectedValue(new Error('offline'));

    await expect(
      reconcileTimezone(dispatch, profile({ timezoneSource: 'DEFAULT' }))
    ).resolves.toBeUndefined();

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('tolerates a profile with no source at all', async () => {
    deviceZone('Europe/Lisbon');

    await reconcileTimezone(dispatch, profile({ timezoneSource: undefined as never }));

    expect(editUserMock).not.toHaveBeenCalled();
  });
});

describe('detectTimezone (mobile)', () => {
  beforeEach(() => getCalendarsMock.mockReset());

  it('returns the device zone', () => {
    deviceZone('America/Sao_Paulo');
    expect(detectTimezone()).toBe('America/Sao_Paulo');
  });

  it('returns null when expo-localization has no calendar', () => {
    getCalendarsMock.mockReturnValue([]);
    expect(detectTimezone()).toBeNull();
  });

  it('returns null rather than throwing', () => {
    deviceZone(null);
    expect(detectTimezone()).toBeNull();
  });
});
