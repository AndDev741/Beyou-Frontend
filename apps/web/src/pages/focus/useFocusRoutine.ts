import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import type { RootState } from "@beyou/state/rootReducer";
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
 */
export function useFocusRoutine(): { loading: boolean; error: string | null } {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const routine = useSelector((state: RootState) => state.todayRoutine.routine);
    const [settled, setSettled] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        (async () => {
            try {
                const [routineRes, habitsRes, tasksRes] = await Promise.all([
                    getTodayRoutine(t),
                    getHabits(t),
                    getTasks(t),
                ]);
                if (!active) return;
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
                if (failure) setError(String(failure));
            } catch (e) {
                logger.error(e);
                if (active) setError(t("UnexpectedError"));
            } finally {
                if (active) setSettled(true);
            }
        })();

        return () => {
            active = false;
        };
    }, [dispatch, t]);

    // The header's "checked of total" reads the perfil slice, which the dashboard fills in.
    // `perfil` is blacklisted from redux-persist, so a reload straight onto the focus screen
    // has nothing there and the count would sit at zero next to a half-done routine.
    useEffect(() => {
        const today = new Date().toJSON().slice(0, 10);
        const { checked, total } = calculateDailyProgress(routine, today);
        dispatch(checkedItemsInScheduledRoutineEnter(checked));
        dispatch(totalItemsInScheduledRoutineEnter(total));
    }, [routine, dispatch]);

    return { loading: !settled && routine === null, error };
}
