import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import getHabits from "@beyou/api/habits/getHabits";
import getTasks from "@beyou/api/tasks/getTasks";
import { enterHabits } from "@beyou/state/habit/habitsSlice";
import { enterTasks } from "@beyou/state/task/tasksSlice";
import type { habit } from "@beyou/types/habit/habitType";
import type { task } from "@beyou/types/tasks/taskType";

/**
 * The one door through which the habits and tasks pages fetch their lists.
 *
 * Those two pages keep the list they render in local state rather than reading the slice,
 * which is older than the shared store and not the subject here. What went wrong is that
 * their fetches, and the refetch their forms run after a save, wrote ONLY to that local
 * state. The `habits` and `tasks` slices are persisted, and every routine row on the
 * dashboard and on the focus screen resolves its name, icon and phrase from them by id. So a
 * habit renamed on its own page kept the old name in the store, and the focus screen showed
 * that old name until its own fetch happened to land. When that fetch failed, or never ran
 * because the screen was already open, it never changed at all.
 *
 * Every path now funnels through here and the store receives the same list the page is about
 * to show. Written once so that a future third caller (a delete, a quick-create) cannot forget
 * the dispatch: if a page needs the list, it asks this hook, not the api module.
 *
 * Returns the list so the caller can set its local state, or null when the request failed.
 */
export function useSyncedHabits(): () => Promise<habit[] | null> {
    const dispatch = useDispatch();
    const { t } = useTranslation();

    return useCallback(async () => {
        const response = await getHabits(t);
        if (!Array.isArray(response.success)) return null;
        dispatch(enterHabits(response.success));
        return response.success;
    }, [dispatch, t]);
}

/** The tasks twin of {@link useSyncedHabits}. Same reason, same shape. */
export function useSyncedTasks(): () => Promise<task[] | null> {
    const dispatch = useDispatch();
    const { t } = useTranslation();

    return useCallback(async () => {
        const response = await getTasks(t);
        if (!Array.isArray(response.success)) return null;
        dispatch(enterTasks(response.success));
        return response.success;
    }, [dispatch, t]);
}
