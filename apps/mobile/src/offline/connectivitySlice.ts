import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface ConnectivityState {
  /** null until the first network report arrives */
  isOnline: boolean | null;
  /** per-episode: reset to false every time the device GOES offline */
  bannerDismissed: boolean;
  pendingOps: number;
}

const initialState: ConnectivityState = { isOnline: null, bannerDismissed: false, pendingOps: 0 };

const connectivitySlice = createSlice({
  name: 'connectivity',
  initialState,
  reducers: {
    setOnline(state, action: PayloadAction<boolean>) {
      const wasOffline = state.isOnline === false;
      state.isOnline = action.payload;
      if (!action.payload && !wasOffline) {
        // a NEW offline episode — the banner must show again
        state.bannerDismissed = false;
      }
    },
    dismissBanner(state) {
      state.bannerDismissed = true;
    },
    setPendingOps(state, action: PayloadAction<number>) {
      state.pendingOps = action.payload;
    },
  },
});

export const { setOnline, dismissBanner, setPendingOps } = connectivitySlice.actions;
export default connectivitySlice.reducer;
