import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import { useTranslation } from "react-i18next";
import type { Dispatch } from "@reduxjs/toolkit";
import type { TFunction } from "i18next";
import { getStudyToday } from "@beyou/api/notebook";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import { enterStudyToday, refreshStudyCycles } from "@beyou/state";
import type { RootState } from "@beyou/state/rootReducer";
import useTodayInZone from "../../../hooks/useTodayInZone";

/**
 * One read of today's slice at a time.
 *
 * The dashboard mounts every widget twice (the phone carousel and the desktop rail, one of them
 * hidden by CSS), and the notebook home can hold the card while the widget is still on screen
 * in another tab of the router. Without this, each mount fired its own GET.
 */
let inflight: Promise<ApiErrorPayload | null> | null = null;

export function loadStudyToday(dispatch: Dispatch, t: TFunction): Promise<ApiErrorPayload | null> {
    if (!inflight) {
        inflight = getStudyToday(t)
            .then((response) => {
                if (response.success) dispatch(enterStudyToday(response.success));
                return response.success ? null : response.error ?? {};
            })
            .finally(() => {
                inflight = null;
            });
    }
    return inflight;
}

/**
 * Today's slice of the study cycles, read from the store and refreshed on mount and when the
 * day turns. The notebook's card and the dashboard widget both read it, so a block closed on one
 * is closed on the other.
 */
export function useStudyToday() {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const today = useSelector((state: RootState) => state.studyCycles.today);
    const day = useTodayInZone();
    const [error, setError] = useState<ApiErrorPayload | null>(null);

    useEffect(() => {
        let cancelled = false;
        void loadStudyToday(dispatch, t).then((failure) => {
            if (!cancelled) setError(failure);
        });
        return () => {
            cancelled = true;
        };
    }, [dispatch, t, day]);

    // `day` re-reads the slice when midnight passes. The slice is not filtered by it: the server
    // dates "today" by the account's zone, which can differ from the browser's when the profile
    // has none, and a card that hid itself over that would never come back.
    return { today, error };
}

/**
 * Re-reads the study cycles after a write: today's slice, the list, and every cycle open in
 * full. Reads the store at call time, so a cycle opened after render is included.
 */
export function useRefreshStudyCycles() {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const store = useStore();
    return useCallback(
        () => refreshStudyCycles(dispatch, (store.getState() as RootState).studyCycles, t),
        [dispatch, store, t]
    );
}
