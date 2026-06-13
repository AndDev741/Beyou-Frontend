import { describe, it, expect } from 'vitest';
import snapshotReducer, {
    enterSnapshot,
    enterSnapshots,
    clearSnapshot,
    enterSnapshotDates,
    setSelectedDate,
    setSnapshotLoading,
    updateSnapshotCheck,
} from '../snapshotSlice';
import { Snapshot, SnapshotCheck } from '../../../types/routine/snapshot';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const buildCheck = (overrides: Partial<SnapshotCheck> = {}): SnapshotCheck => ({
    id: 'check-1',
    itemType: 'HABIT',
    itemName: 'Drink water',
    itemIconId: 'water',
    sectionName: 'Morning',
    originalGroupId: 'group-1',
    difficulty: 3,
    importance: 4,
    checked: false,
    skipped: false,
    checkTime: null,
    xpGenerated: 0,
    ...overrides,
});

const buildSnapshot = (overrides: Partial<Snapshot> = {}): Snapshot => ({
    id: 'snap-1',
    snapshotDate: '2025-06-15',
    routineName: 'Morning Routine',
    routineIconId: 'sunrise',
    completed: false,
    structure: {
        sections: [
            {
                name: 'Morning',
                iconId: 'sun',
                orderIndex: 0,
                startTime: '07:00',
                endTime: '10:00',
                items: [
                    {
                        type: 'HABIT',
                        groupId: 'group-1',
                        itemId: 'habit-1',
                        name: 'Drink water',
                        iconId: 'water',
                        startTime: '07:00',
                        endTime: '07:30',
                    },
                ],
            },
        ],
    },
    checks: [buildCheck()],
    ...overrides,
});

const initialState = {
    snapshots: {},
    snapshotDates: [],
    selectedDate: '',
    loading: false,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('snapshotSlice', () => {
    it('returns the correct initial state', () => {
        const state = snapshotReducer(undefined, { type: '@@INIT' });
        expect(state).toEqual(initialState);
    });

    // -----------------------------------------------------------------------
    // enterSnapshot
    // -----------------------------------------------------------------------
    describe('enterSnapshot', () => {
        it('stores a single snapshot keyed by id', () => {
            const snapshot = buildSnapshot();
            const state = snapshotReducer(initialState, enterSnapshot(snapshot));

            expect(state.snapshots['snap-1']).toEqual(snapshot);
        });

        it('overwrites an existing snapshot with the same id', () => {
            const first = buildSnapshot({ routineName: 'First' });
            const second = buildSnapshot({ routineName: 'Updated' });

            let state = snapshotReducer(initialState, enterSnapshot(first));
            state = snapshotReducer(state, enterSnapshot(second));

            expect(state.snapshots['snap-1'].routineName).toBe('Updated');
            expect(Object.keys(state.snapshots)).toHaveLength(1);
        });

        it('adds a second snapshot without removing the first', () => {
            const first = buildSnapshot({ id: 'snap-1' });
            const second = buildSnapshot({ id: 'snap-2', routineName: 'Evening' });

            let state = snapshotReducer(initialState, enterSnapshot(first));
            state = snapshotReducer(state, enterSnapshot(second));

            expect(Object.keys(state.snapshots)).toHaveLength(2);
            expect(state.snapshots['snap-1']).toBeDefined();
            expect(state.snapshots['snap-2']).toBeDefined();
        });
    });

    // -----------------------------------------------------------------------
    // enterSnapshots (batch)
    // -----------------------------------------------------------------------
    describe('enterSnapshots', () => {
        it('replaces all snapshots with the provided array', () => {
            const existing = buildSnapshot({ id: 'old' });
            const startState = snapshotReducer(initialState, enterSnapshot(existing));

            const newSnapshots = [
                buildSnapshot({ id: 'new-1' }),
                buildSnapshot({ id: 'new-2' }),
            ];
            const state = snapshotReducer(startState, enterSnapshots(newSnapshots));

            expect(Object.keys(state.snapshots)).toHaveLength(2);
            expect(state.snapshots['old']).toBeUndefined();
            expect(state.snapshots['new-1']).toBeDefined();
            expect(state.snapshots['new-2']).toBeDefined();
        });

        it('clears snapshots when given an empty array', () => {
            const existing = buildSnapshot();
            const startState = snapshotReducer(initialState, enterSnapshot(existing));
            const state = snapshotReducer(startState, enterSnapshots([]));

            expect(state.snapshots).toEqual({});
        });
    });

    // -----------------------------------------------------------------------
    // clearSnapshot
    // -----------------------------------------------------------------------
    describe('clearSnapshot', () => {
        it('resets all state to initial values', () => {
            const populated = {
                snapshots: { 'snap-1': buildSnapshot() },
                snapshotDates: ['2025-06-15', '2025-06-16'],
                selectedDate: '2025-06-15',
                loading: true,
            };

            const state = snapshotReducer(populated, clearSnapshot());
            expect(state).toEqual(initialState);
        });
    });

    // -----------------------------------------------------------------------
    // enterSnapshotDates
    // -----------------------------------------------------------------------
    describe('enterSnapshotDates', () => {
        it('stores an array of date strings', () => {
            const dates = ['2025-06-01', '2025-06-05', '2025-06-15'];
            const state = snapshotReducer(initialState, enterSnapshotDates(dates));

            expect(state.snapshotDates).toEqual(dates);
        });

        it('replaces previously stored dates', () => {
            const first = ['2025-06-01'];
            const second = ['2025-07-01', '2025-07-10'];

            let state = snapshotReducer(initialState, enterSnapshotDates(first));
            state = snapshotReducer(state, enterSnapshotDates(second));

            expect(state.snapshotDates).toEqual(second);
        });
    });

    // -----------------------------------------------------------------------
    // setSelectedDate
    // -----------------------------------------------------------------------
    describe('setSelectedDate', () => {
        it('updates the selected date', () => {
            const state = snapshotReducer(initialState, setSelectedDate('2025-06-15'));
            expect(state.selectedDate).toBe('2025-06-15');
        });

        it('can be set to an empty string', () => {
            const populated = { ...initialState, selectedDate: '2025-06-15' };
            const state = snapshotReducer(populated, setSelectedDate(''));
            expect(state.selectedDate).toBe('');
        });
    });

    // -----------------------------------------------------------------------
    // setSnapshotLoading
    // -----------------------------------------------------------------------
    describe('setSnapshotLoading', () => {
        it('sets loading to true', () => {
            const state = snapshotReducer(initialState, setSnapshotLoading(true));
            expect(state.loading).toBe(true);
        });

        it('sets loading to false', () => {
            const loaded = { ...initialState, loading: true };
            const state = snapshotReducer(loaded, setSnapshotLoading(false));
            expect(state.loading).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // updateSnapshotCheck
    // -----------------------------------------------------------------------
    describe('updateSnapshotCheck', () => {
        it('updates a check within the correct snapshot', () => {
            const snapshot = buildSnapshot();
            const startState = snapshotReducer(initialState, enterSnapshot(snapshot));

            const state = snapshotReducer(
                startState,
                updateSnapshotCheck({
                    snapshotId: 'snap-1',
                    snapshotCheckId: 'check-1',
                    checked: true,
                    skipped: false,
                    checkTime: '07:15',
                    xpGenerated: 25,
                }),
            );

            const updatedCheck = state.snapshots['snap-1'].checks[0];
            expect(updatedCheck.checked).toBe(true);
            expect(updatedCheck.skipped).toBe(false);
            expect(updatedCheck.checkTime).toBe('07:15');
            expect(updatedCheck.xpGenerated).toBe(25);
        });

        it('marks a check as skipped', () => {
            const snapshot = buildSnapshot();
            const startState = snapshotReducer(initialState, enterSnapshot(snapshot));

            const state = snapshotReducer(
                startState,
                updateSnapshotCheck({
                    snapshotId: 'snap-1',
                    snapshotCheckId: 'check-1',
                    checked: false,
                    skipped: true,
                    checkTime: null,
                    xpGenerated: 0,
                }),
            );

            const updatedCheck = state.snapshots['snap-1'].checks[0];
            expect(updatedCheck.checked).toBe(false);
            expect(updatedCheck.skipped).toBe(true);
        });

        it('does nothing when the snapshot id does not exist', () => {
            const snapshot = buildSnapshot();
            const startState = snapshotReducer(initialState, enterSnapshot(snapshot));

            const state = snapshotReducer(
                startState,
                updateSnapshotCheck({
                    snapshotId: 'nonexistent',
                    snapshotCheckId: 'check-1',
                    checked: true,
                    skipped: false,
                    checkTime: '07:15',
                    xpGenerated: 25,
                }),
            );

            // Original check should remain unchanged
            expect(state.snapshots['snap-1'].checks[0].checked).toBe(false);
        });

        it('does nothing when the check id does not exist in the snapshot', () => {
            const snapshot = buildSnapshot();
            const startState = snapshotReducer(initialState, enterSnapshot(snapshot));

            const state = snapshotReducer(
                startState,
                updateSnapshotCheck({
                    snapshotId: 'snap-1',
                    snapshotCheckId: 'nonexistent-check',
                    checked: true,
                    skipped: false,
                    checkTime: '07:15',
                    xpGenerated: 25,
                }),
            );

            // Original check should remain unchanged
            expect(state.snapshots['snap-1'].checks[0].checked).toBe(false);
        });

        it('updates the correct check when a snapshot has multiple checks', () => {
            const snapshot = buildSnapshot({
                checks: [
                    buildCheck({ id: 'check-1', itemName: 'Drink water' }),
                    buildCheck({ id: 'check-2', itemName: 'Meditate' }),
                    buildCheck({ id: 'check-3', itemName: 'Exercise' }),
                ],
            });
            const startState = snapshotReducer(initialState, enterSnapshot(snapshot));

            const state = snapshotReducer(
                startState,
                updateSnapshotCheck({
                    snapshotId: 'snap-1',
                    snapshotCheckId: 'check-2',
                    checked: true,
                    skipped: false,
                    checkTime: '08:00',
                    xpGenerated: 15,
                }),
            );

            expect(state.snapshots['snap-1'].checks[0].checked).toBe(false);
            expect(state.snapshots['snap-1'].checks[1].checked).toBe(true);
            expect(state.snapshots['snap-1'].checks[1].xpGenerated).toBe(15);
            expect(state.snapshots['snap-1'].checks[2].checked).toBe(false);
        });
    });
});
