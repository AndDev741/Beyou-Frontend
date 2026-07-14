import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { getLogger } from "@beyou/api";
import getHabits from "@beyou/api/habits/getHabits";
import getCategories from "@beyou/api/categories/getCategories";
import getTasks from "@beyou/api/tasks/getTasks";
import getGoals from "@beyou/api/goals/getGoals";
import getRoutines from "@beyou/api/routine/getRoutines";
import getTodayRoutine from "@beyou/api/routine/getTodayRoutine";
import getProfile from "@beyou/api/user/getProfile";
import { enterHabits } from "@beyou/state/habit/habitsSlice";
import { enterCategories } from "@beyou/state/category/categoriesSlice";
import { enterTasks } from "@beyou/state/task/tasksSlice";
import { enterGoals } from "@beyou/state/goal/goalsSlice";
import { enterRoutines } from "@beyou/state/routine/routinesSlice";
import { enterTodayRoutine } from "@beyou/state/routine/todayRoutineSlice";
import { hydratePerfil } from "../services/user/hydratePerfil";

/**
 * Refetches exactly the Redux slices an agent turn changed. The write tools
 * report which domains they touched (AgentToolDomains on the backend); this
 * hook maps each domain to "refetch that slice" and runs the union once.
 *
 * ponytail: the Habits and Tasks pages still hold local state instead of
 * Redux, so refreshing those slices won't update them while open — they
 * catch up on next mount. Dashboard and other Redux readers reflect at once.
 */
export function useAgentRefresh() {
    const dispatch = useDispatch();
    const { t } = useTranslation();

    return useCallback(
        async (domains: string[]) => {
            const refreshers: Record<string, () => Promise<void>> = {
                habits: async () => {
                    const r = await getHabits(t);
                    if (r.success) dispatch(enterHabits(r.success));
                },
                categories: async () => {
                    const r = await getCategories(t);
                    if (r.success) dispatch(enterCategories(r.success));
                },
                tasks: async () => {
                    const r = await getTasks(t);
                    if (r.success) dispatch(enterTasks(r.success));
                },
                goals: async () => {
                    const r = await getGoals(t);
                    if (r.success) dispatch(enterGoals(r.success));
                },
                routines: async () => {
                    // A routine change also shifts today's view (schedule, items).
                    const [routines, today] = await Promise.all([getRoutines(t), getTodayRoutine(t)]);
                    if (routines.success) dispatch(enterRoutines(routines.success));
                    // success is null when there's genuinely no routine today (valid,
                    // dispatch it); undefined means the fetch failed — don't wipe the view.
                    if (today.success !== undefined) dispatch(enterTodayRoutine(today.success));
                },
                perfil: async () => {
                    const profile = await getProfile();
                    if (profile.data) hydratePerfil(dispatch, profile.data);
                },
            };

            const unique = [...new Set(domains)];
            await Promise.all(
                unique.map((domain) => {
                    const refresher = refreshers[domain];
                    if (!refresher) {
                        // Backend may ship a new domain before the frontend maps it.
                        getLogger().error(`useAgentRefresh: unknown domain "${domain}"`);
                        return undefined;
                    }
                    return refresher();
                }).filter(Boolean),
            );
        },
        [dispatch, t],
    );
}
