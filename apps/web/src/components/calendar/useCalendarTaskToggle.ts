import { useCallback, useRef, useState } from "react";
import { useDispatch, useStore } from "react-redux";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { toggleCalendarTask } from "@beyou/api/calendar/calendarApi";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import { applyRefreshUi } from "@beyou/state/user/refreshUiThunk";
import type { RootState } from "@beyou/state/rootReducer";
import type { CalendarTask } from "@beyou/types/calendar/calendar";
import { requestReminderResync } from "./reminderPreferenceBus";
import { isCalendarTaskGone } from "./calendarErrors";

/** What a toggle came to: the task as it now is, a task that no longer exists, or a failure. */
export type CalendarToggleOutcome =
    | { kind: "updated"; task: CalendarTask }
    | { kind: "gone"; id: string }
    | { kind: "failed" };

/**
 * Completes or un-completes a calendar task and moves the XP everywhere.
 *
 * The response carries a `RefreshUI`, and it goes through the same `applyRefreshUi` every other
 * check uses (see `useRoutineCheckin`), reading the profile right before applying so a level-up
 * celebrates against the state the click started from. Shared by the Calendar page and the
 * dashboard widget so the two cannot pay XP differently.
 *
 * A task deleted on another device comes back as `gone`, so the caller can drop it from its
 * list; every other failure is toasted here and comes back as `failed`.
 */
export function useCalendarTaskToggle() {
    const dispatch = useDispatch();
    const store = useStore<RootState>();
    const { t } = useTranslation();
    // The ref answers "is this one in flight" synchronously, so a double click cannot send two
    // toggles that cancel each other out; the state only drives the disabled look.
    const inFlight = useRef(new Set<string>());
    const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set());

    const toggle = useCallback(
        async (task: CalendarTask): Promise<CalendarToggleOutcome> => {
            if (inFlight.current.has(task.id)) return { kind: "failed" };
            inFlight.current.add(task.id);
            setPending(new Set(inFlight.current));

            const response = await toggleCalendarTask(task.id, t);

            inFlight.current.delete(task.id);
            setPending(new Set(inFlight.current));

            if (response.success) {
                const previous = store.getState().perfil;
                applyRefreshUi(response.success.refreshUi, dispatch, previous);
                // A completed task stops reminding; an un-completed one may remind again.
                requestReminderResync();
                return { kind: "updated", task: response.success.task };
            }
            if (isCalendarTaskGone(response.error)) {
                toast.info(t("CALENDAR_TASK_NOT_FOUND"));
                requestReminderResync();
                return { kind: "gone", id: task.id };
            }
            toast.error(getFriendlyErrorMessage(t, response.error));
            return { kind: "failed" };
        },
        [dispatch, store, t],
    );

    return { toggle, pending };
}
