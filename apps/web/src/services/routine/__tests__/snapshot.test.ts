import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { getSnapshot, getSnapshotDatesForMonth, checkSnapshotItem, skipSnapshotItem } from '../snapshot';

// The global setupTests.tsx already mocks axios, so axiosConfig will use the mock.
// We need to get a reference to the mock instance returned by axios.create().
import axios from 'axios';

const mockAxiosInstance = (axios as any).create();

const t = ((key: string) => key) as any;

beforeEach(() => {
    vi.clearAllMocks();
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

        (mockAxiosInstance.get as Mock).mockResolvedValueOnce({ data: snapshotData });

        const result = await getSnapshot('routine-1', '2025-06-15', t);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
            '/routine/routine-1/snapshot',
            { params: { date: '2025-06-15' } },
        );
        expect(result).toEqual({ success: snapshotData });
    });

    it('returns an error message on failure', async () => {
        (mockAxiosInstance.get as Mock).mockRejectedValueOnce(new Error('Network error'));

        const result = await getSnapshot('routine-1', '2025-06-15', t);

        expect(result).toEqual({ error: 'UnexpectedError' });
    });

    it('logs when the error is an axios error', async () => {
        const axiosError = new Error('Request failed');
        (axios.isAxiosError as Mock).mockReturnValueOnce(true);
        (mockAxiosInstance.get as Mock).mockRejectedValueOnce(axiosError);

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        await getSnapshot('routine-1', '2025-06-15', t);

        expect(consoleSpy).toHaveBeenCalledWith(axiosError);
        consoleSpy.mockRestore();
    });
});

// ---------------------------------------------------------------------------
// getSnapshotDatesForMonth
// ---------------------------------------------------------------------------
describe('getSnapshotDatesForMonth', () => {
    it('calls the correct URL with month param and returns dates on success', async () => {
        const datesData = { dates: ['2025-06-01', '2025-06-15'] };
        (mockAxiosInstance.get as Mock).mockResolvedValueOnce({ data: datesData });

        const result = await getSnapshotDatesForMonth('routine-1', '2025-06', t);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
            '/routine/routine-1/snapshots',
            { params: { month: '2025-06' } },
        );
        expect(result).toEqual({ success: datesData });
    });

    it('returns an error message on failure', async () => {
        (mockAxiosInstance.get as Mock).mockRejectedValueOnce(new Error('Network error'));

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
        (mockAxiosInstance.post as Mock).mockResolvedValueOnce({ data: refreshUiData });

        const result = await checkSnapshotItem('snap-1', 'check-1', t);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
            '/routine/snapshot/check',
            { snapshotId: 'snap-1', snapshotCheckId: 'check-1' },
        );
        expect(result).toEqual({ success: refreshUiData });
    });

    it('returns parsed API error when an axios error occurs', async () => {
        const axiosError = {
            response: { data: { errorKey: 'SNAPSHOT_EXPIRED', message: 'Snapshot expired' } },
        };
        (axios.isAxiosError as Mock).mockReturnValueOnce(true);
        (mockAxiosInstance.post as Mock).mockRejectedValueOnce(axiosError);

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = await checkSnapshotItem('snap-1', 'check-1', t);

        expect(result.error).toBeDefined();
        consoleSpy.mockRestore();
    });

    it('returns a generic error message for non-axios errors', async () => {
        (axios.isAxiosError as Mock).mockReturnValueOnce(false);
        (mockAxiosInstance.post as Mock).mockRejectedValueOnce(new Error('Unknown'));

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
        (mockAxiosInstance.post as Mock).mockResolvedValueOnce({ data: refreshUiData });

        const result = await skipSnapshotItem('snap-1', 'check-1', t);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
            '/routine/snapshot/skip',
            { snapshotId: 'snap-1', snapshotCheckId: 'check-1' },
        );
        expect(result).toEqual({ success: refreshUiData });
    });

    it('returns parsed API error when an axios error occurs', async () => {
        const axiosError = {
            response: { data: { message: 'Cannot skip' } },
        };
        (axios.isAxiosError as Mock).mockReturnValueOnce(true);
        (mockAxiosInstance.post as Mock).mockRejectedValueOnce(axiosError);

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = await skipSnapshotItem('snap-1', 'check-1', t);

        expect(result.error).toBeDefined();
        consoleSpy.mockRestore();
    });

    it('returns a generic error message for non-axios errors', async () => {
        (axios.isAxiosError as Mock).mockReturnValueOnce(false);
        (mockAxiosInstance.post as Mock).mockRejectedValueOnce(new Error('Unknown'));

        const result = await skipSnapshotItem('snap-1', 'check-1', t);

        expect(result).toEqual({ error: { message: 'UnexpectedError' } });
    });
});
