import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import type { RootState } from "@beyou/state/rootReducer";
import type { RefreshReason } from "@beyou/state/sync/autoRefresh";
import { calculateDailyProgress } from "@beyou/state/dashboard/helpers";
import { enterTodayRoutine } from "@beyou/state/routine/todayRoutineSlice";
import { enterHabits } from "@beyou/state/habit/habitsSlice";
import { enterTasks } from "@beyou/state/task/tasksSlice";
import {
    checkedItemsInScheduledRoutineEnter,
    totalItemsInScheduledRoutineEnter,
} from "@beyou/state/user/perfilSlice";
import getTodayRoutine from "@beyou/api/routine/getTodayRoutine";
import getHabits from "@beyou/api/habits/getHabits";
import getTasks from "@beyou/api/tasks/getTasks";
import { logger } from "../../utils/logger";
import useTodayInZone from "../../hooks/useTodayInZone";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";

/**
 * Everything the focus screen needs, fetched by the screen itself.
 *
 * Three requests, not one. The routine only carries item GROUPS: the names and icons live in
 * the habits and tasks slices, and `routineSection` renders nothing at all for a group whose
 * habit or task it cannot find. So a focus screen reached directly (a reload, a bookmark, a
 * link) without those two would draw an empty routine and look broken rather than empty.
 *
 * It always fetches, and deliberately does not try to detect "already loaded". Both slices
 * start as `[]`, so an empty array cannot be told apart from a user who genuinely has no
 * habits, and any guess there either refetches forever or skips the fetch the new user needs.
 * What it does instead is keep rendering whatever the store already holds while the requests
 * are in flight, so arriving from the dashboard shows the routine immediately and the fetch
 * is just a refresh.
 *
 * And it keeps refreshing. This screen was the one data screen without `useAutoRefresh`, and
 * it is the screen people leave open longest: a pomodoro is 25 minutes with nothing else on
 * the display. A habit renamed on the phone, or in another tab, in that window never arrived,
 * because the names come from the slices and nothing here asked again. Now it joins the same
 * policy as the dashboard: coming back to the tab, the day turning over, and time passing.
 */
export function useFocusRoutine(): { loading: boolean; error: string | null } {
    const dispatch = useDispatch();
    // The owner's day, re-read when it turns: `toJSON()` would give the UTC one, and the progress
    // header would count yesterday's checks in Brazil after 21:00.
    const today = useTodayInZone();
    const { t } = useTranslation();
    const routine = useSelector((state: RootState) => state.todayRoutine.routine);
    const [settled, setSettled] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // `reason` is set by the auto-refresh and absent on the mount fetch. A background refresh
    // that fails keeps whatever is on screen and says nothing: the runner logs it, and a banner
    // over a routine that was fine a minute ago would be noise. The first load has nothing to
    // fall back on, so that one does report.
    const load = useCallback(
        async (reason?: RefreshReason) => {
            try {
                const [routineRes, habitsRes, tasksRes] = await Promise.all([
                    getTodayRoutine(t),
                    getHabits(t),
                    getTasks(t),
                ]);
                // Each is applied on its own: a failed habits call must not throw away a
                // routine that arrived fine, which is the shape the mobile agent refresh
                // had to be fixed into once already.
                if (routineRes.success) dispatch(enterTodayRoutine(routineRes.success));
                if (habitsRes.success) dispatch(enterHabits(habitsRes.success));
                if (tasksRes.success) dispatch(enterTasks(tasksRes.success));
                // Any of the three: the routine is only readable WITH its habits and tasks, so a
                // failed habits call leaves sections with no rows in them, which reads as a bug
                // rather than as a failure. First error wins; they are all the same sentence.
                const failure = routineRes.error ?? habitsRes.error ?? tasksRes.error;
                if (!failure) setError(null);
                else if (!reason) setError(String(failure));
            } catch (e) {
                logger.error(e);
                if (!reason) setError(t("UnexpectedError"));
            } finally {
                setSettled(true);
            }
        },
        [dispatch, t]
    );

    useEffect(() => {
        void load();
    }, [load]);

    useAutoRefresh(load);

    // The header's "checked of total" reads the perfil slice, which the dashboard fills in.
    // `perfil` is blacklisted from redux-persist, so a reload straight onto the focus screen
    // has nothing there and the count would sit at zero next to a half-done routine.
    useEffect(() => {
        const { checked, total } = calculateDailyProgress(routine, today);
        dispatch(checkedItemsInScheduledRoutineEnter(checked));
        dispatch(totalItemsInScheduledRoutineEnter(total));
    }, [routine, today, dispatch]);

    return { loading: !settled && routine === null, error };
}
