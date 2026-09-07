import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { getMoodEntries } from "@beyou/api/mood/moodApi";
import { enterMoodEntries } from "@beyou/state";
import type { RootState } from "@beyou/state/rootReducer";
import type { MoodEntry } from "@beyou/types/mood/mood";

type UseMoodRangeResult = {
    /** Only the days inside the requested window, newest first. */
    entries: MoodEntry[];
    /** Every day the store currently holds, for O(1) lookups while rendering. */
    byDate: Record<string, MoodEntry>;
    loading: boolean;
    error: string | null;
    /** Re-reads the same window. For after a write that may have removed a day. */
    refresh: () => void;
};

/**
 * One `GET /mood?from&to`, merged into the shared slice.
 *
 * The results land in Redux rather than in component state so the widget and the page agree:
 * both read the same map, and a face tapped on the dashboard is already correct when the page
 * opens. Arguments are the two date strings, so the effect's dependencies are the query itself.
 */
export default function useMoodRange(from: string, to: string): UseMoodRangeResult {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const byDate = useSelector((state: RootState) => state.mood.byDate);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloads, setReloads] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        getMoodEntries({ from, to }, t).then((response) => {
            if (cancelled) return;
            if (response.success) {
                dispatch(enterMoodEntries(response.success));
            } else {
                setError(response.error?.errorKey ?? t("UnexpectedError"));
            }
            setLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [from, to, reloads, dispatch, t]);

    const refresh = useCallback(() => setReloads((previous) => previous + 1), []);

    // Filtered here rather than in the selector: the slice holds every day loaded so far, and a
    // caller asking for one week must not be handed last month's as well.
    const entries = Object.values(byDate)
        .filter((entry) => entry.date >= from && entry.date <= to)
        .sort((a, b) => b.date.localeCompare(a.date));

    return { entries, byDate, loading, error, refresh };
}
