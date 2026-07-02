import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSnapshot, getSnapshotsForDay, getSnapshotDatesForMonth, checkSnapshotItem, skipSnapshotItem } from '../snapshot';
import { setHttpClient, ApiError } from '../../httpClient';
import type { HttpClient } from '../../httpClient';

// ---------------------------------------------------------------------------
// Mock client setup
// ---------------------------------------------------------------------------

function makeMockClient(): HttpClient {
    return {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    };
}

let mockClient: HttpClient;

const t = ((key: string) => key) as any;

beforeEach(() => {
    mockClient = makeMockClient();
    setHttpClient(mockClient);
});

// ---------------------------------------------------------------------------
// getSnapshot
// ---------------------------------------------------------------------------
describe('getSnapshot', () => {
    it('calls the correct URL with date param and returns data on success', async () => {
        const snapshotData = {
            id: 'snap-1',
            snapshotDate: '2025-06-15',
            routineName: 'Morning',
            routineIconId: 'sun',
            completed: false,
            structure: { sections: [] },
            checks: [],
        };

        (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            data: snapshotData,
            headers: {},
        });

        const result = await getSnapshot('routine-1', '2025-06-15', t);

        expect(mockClient.get).toHaveBeenCalledWith(
            '/routine/routine-1/snapshot',
            { params: { date: '2025-06-15' } },
        );
        expect(result).toEqual({ success: snapshotData });
    });

    it('returns an error message on failure (generic error)', async () => {
        (mockClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

        const result = await getSnapshot('routine-1', '2025-06-15', t);

        expect(result).toEqual({ error: 'UnexpectedError' });
    });

    it('logs and returns error when the error is an ApiError', async () => {
        const apiError = new ApiError(500, { message: 'Server error' });
        (mockClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(apiError);

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = await getSnapshot('routine-1', '2025-06-15', t);

        expect(consoleSpy).toHaveBeenCalledWith(apiError);
        expect(result).toEqual({ error: 'UnexpectedError' });
        consoleSpy.mockRestore();
    });
});

// ---------------------------------------------------------------------------
// getSnapshotsForDay (batched — all routines' snapshots for a day in one call)
// ---------------------------------------------------------------------------
describe('getSnapshotsForDay', () => {
    it('calls /routine/snapshot once with the date param and returns the array', async () => {
        const daySnapshots = [
            { id: 'snap-1', routineId: 'r1', snapshotDate: '2025-06-15', routineName: 'Morning', routineIconId: 'sun', completed: false, structure: { sections: [] }, checks: [] },
            { id: 'snap-2', routineId: 'r2', snapshotDate: '2025-06-15', routineName: 'Evening', routineIconId: 'moon', completed: true, structure: { sections: [] }, checks: [] },
        ];
        (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: daySnapshots, headers: {} });

        const result = await getSnapshotsForDay('2025-06-15', t);

        expect(mockClient.get).toHaveBeenCalledTimes(1);
        expect(mockClient.get).toHaveBeenCalledWith('/routine/snapshot', { params: { date: '2025-06-15' } });
        expect(result).toEqual({ success: daySnapshots });
    });

    it('returns an error message on failure', async () => {
        (mockClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

        const result = await getSnapshotsForDay('2025-06-15', t);

        expect(result).toEqual({ error: 'UnexpectedError' });
    });
});

// ---------------------------------------------------------------------------
// getSnapshotDatesForMonth
// ---------------------------------------------------------------------------
describe('getSnapshotDatesForMonth', () => {
    it('calls the correct URL with month param and returns dates on success', async () => {
        const datesData = { dates: ['2025-06-01', '2025-06-15'] };
        (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            data: datesData,
            headers: {},
        });

        const result = await getSnapshotDatesForMonth('routine-1', '2025-06', t);

        expect(mockClient.get).toHaveBeenCalledWith(
            '/routine/routine-1/snapshots',
            { params: { month: '2025-06' } },
        );
        expect(result).toEqual({ success: datesData });
    });

    it('returns an error message on failure', async () => {
        (mockClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

        const result = await getSnapshotDatesForMonth('routine-1', '2025-06', t);

        expect(result).toEqual({ error: 'UnexpectedError' });
    });
});

// ---------------------------------------------------------------------------
// checkSnapshotItem
// ---------------------------------------------------------------------------
describe('checkSnapshotItem', () => {
    it('sends a POST with the correct body and returns success', async () => {
        const refreshUiData = { refreshUser: { xp: 100, level: 2 } };
        (mockClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            data: refreshUiData,
            headers: {},
        });

        const result = await checkSnapshotItem('snap-1', 'check-1', t);

        expect(mockClient.post).toHaveBeenCalledWith(
            '/routine/snapshot/check',
            { snapshotId: 'snap-1', snapshotCheckId: 'check-1' },
        );
        expect(result).toEqual({ success: refreshUiData });
    });

    it('returns parsed API error when an ApiError occurs', async () => {
        const apiError = new ApiError(422, { errorKey: 'SNAPSHOT_EXPIRED', message: 'Snapshot expired' });
        (mockClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(apiError);

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = await checkSnapshotItem('snap-1', 'check-1', t);

        expect(result.error).toBeDefined();
        consoleSpy.mockRestore();
    });

    it('returns a generic error message for non-ApiError errors', async () => {
        (mockClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Unknown'));

        const result = await checkSnapshotItem('snap-1', 'check-1', t);

        expect(result).toEqual({ error: { message: 'UnexpectedError' } });
    });
});

// ---------------------------------------------------------------------------
// skipSnapshotItem
// ---------------------------------------------------------------------------
describe('skipSnapshotItem', () => {
    it('sends a POST to the skip endpoint with the correct body', async () => {
        const refreshUiData = {};
        (mockClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            data: refreshUiData,
            headers: {},
        });

        const result = await skipSnapshotItem('snap-1', 'check-1', t);

        expect(mockClient.post).toHaveBeenCalledWith(
            '/routine/snapshot/skip',
            { snapshotId: 'snap-1', snapshotCheckId: 'check-1' },
        );
        expect(result).toEqual({ success: refreshUiData });
    });

    it('returns parsed API error when an ApiError occurs', async () => {
        const apiError = new ApiError(422, { message: 'Cannot skip' });
        (mockClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(apiError);

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = await skipSnapshotItem('snap-1', 'check-1', t);

        expect(result.error).toBeDefined();
        consoleSpy.mockRestore();
    });

    it('returns a generic error message for non-ApiError errors', async () => {
        (mockClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Unknown'));

        const result = await skipSnapshotItem('snap-1', 'check-1', t);

        expect(result).toEqual({ error: { message: 'UnexpectedError' } });
    });
});
