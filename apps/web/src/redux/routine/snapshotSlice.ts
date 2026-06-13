import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Snapshot } from "../../types/routine/snapshot";

type SnapshotState = {
    snapshots: Record<string, Snapshot>;
    snapshotDates: string[];
    selectedDate: string;
    loading: boolean;
};

const initialState: SnapshotState = {
    snapshots: {},
    snapshotDates: [],
    selectedDate: '',
    loading: false,
};

const snapshotSlice = createSlice({
    name: 'snapshot',
    initialState,
    reducers: {
        enterSnapshot(state, action: PayloadAction<Snapshot>) {
            state.snapshots[action.payload.id] = action.payload;
        },
        enterSnapshots(state, action: PayloadAction<Snapshot[]>) {
            state.snapshots = {};
            action.payload.forEach(snapshot => {
                state.snapshots[snapshot.id] = snapshot;
            });
        },
        clearSnapshot(state) {
            state.snapshots = {};
            state.snapshotDates = [];
            state.selectedDate = '';
            state.loading = false;
        },
        enterSnapshotDates(state, action: PayloadAction<string[]>) {
            state.snapshotDates = action.payload;
        },
        setSelectedDate(state, action: PayloadAction<string>) {
            state.selectedDate = action.payload;
        },
        setSnapshotLoading(state, action: PayloadAction<boolean>) {
            state.loading = action.payload;
        },
        updateSnapshotCheck(state, action: PayloadAction<{
            snapshotId: string;
            snapshotCheckId: string;
            checked: boolean;
            skipped: boolean;
            checkTime: string | null;
            xpGenerated: number;
        }>) {
            const { snapshotId, snapshotCheckId, checked, skipped, checkTime, xpGenerated } = action.payload;
            const snapshot = state.snapshots[snapshotId];
            if (!snapshot) return;

            const check = snapshot.checks.find(c => c.id === snapshotCheckId);
            if (check) {
                check.checked = checked;
                check.skipped = skipped;
                check.checkTime = checkTime;
                check.xpGenerated = xpGenerated;
            }
        }
    }
});

export const {
    enterSnapshot,
    enterSnapshots,
    clearSnapshot,
    enterSnapshotDates,
    setSelectedDate,
    setSnapshotLoading,
    updateSnapshotCheck
} = snapshotSlice.actions;

export default snapshotSlice.reducer;
