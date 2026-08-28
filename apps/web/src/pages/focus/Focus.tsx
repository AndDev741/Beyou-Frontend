import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { List, Target, X } from "lucide-react";
import type { RootState } from "@beyou/state/rootReducer";
import { focusEntered, focusExited, focusModeChanged } from "@beyou/state";
import useAuthGuard from "../../components/useAuthGuard";
import RoutineDay from "../../components/dashboard/dayRoutine/dayRoutine";
import { useFocusRoutine } from "./useFocusRoutine";
import Ultrafoco from "./Ultrafoco";

/**
 * F1 of the Focus Mode: today's routine with nothing else on screen.
 *
 * Rendered as a `fixed inset-0` layer rather than as ordinary page content, because
 * `ProtectedRoute` mounts the shell (sidebar, bottom bar, assistant bubble) for EVERY
 * authenticated route. Sitting inside that layout and covering it is what makes this a route
 * with an auth gate and no chrome, without reshaping the shell for the other eleven pages.
 *
 * z-[70] puts it over the shell (bottom bar 40, assistant bubble 60) and under the modal
 * layer (110), so a delete confirmation opened from inside focus still lands on top.
 *
 * The routine itself is the ordinary `RoutineDay`. Checking, skipping, XP floats and
 * celebrations therefore behave identically here and on the dashboard, because it is the same
 * component and the same check call, not a copy of it.
 */
export default function Focus() {
    useAuthGuard();
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const routine = useSelector((state: RootState) => state.todayRoutine.routine);
    const mode = useSelector((state: RootState) => state.focus.mode);
    const { loading, error } = useFocusRoutine();
    const isUltra = mode === "ultrafoco";

    const leave = useCallback(() => {
        navigate("/dashboard");
    }, [navigate]);

    // Entering and leaving are dispatched here, at the only place that knows the screen is
    // mounted. The mode is what the dashboard card reads to hide its own way in.
    useEffect(() => {
        dispatch(focusEntered());
        return () => {
            dispatch(focusExited());
        };
    }, [dispatch]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            // The shared `Modal` closes itself on Escape too, and both listeners are on the
            // window, so one keypress would close the dialog AND leave focus. Nothing inside
            // F1 opens a modal yet; the guard is here because the later phases will, and this
            // is cheaper than the bug report.
            if (document.querySelector('[role="dialog"]')) return;
            leave();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [leave]);

    return (
        <div
            className="fixed inset-0 z-[70] overflow-y-auto bg-bg"
            role="region"
            aria-label={t("FocusTitle")}
            data-testid="focus-screen"
        >
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-3 py-4 lg:px-6 lg:py-6">
                <header className="flex items-center gap-3 pb-4">
                    <h1 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-3">
                        {t("FocusTitle")}
                    </h1>

                    {/* The two states of the same screen, one toggle. No route change: the
                        mode lives in the store precisely so switching does not reload
                        anything or lose the selection. */}
                    {routine && (
                        <button
                            type="button"
                            onClick={() =>
                                dispatch(focusModeChanged(isUltra ? "fullscreen" : "ultrafoco"))
                            }
                            className="ml-auto inline-flex h-9 items-center gap-2 rounded-control border border-border px-3 text-[12.5px] font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
                            data-testid="focus-mode-toggle"
                        >
                            {isUltra ? (
                                <List size={15} aria-hidden="true" />
                            ) : (
                                <Target size={15} aria-hidden="true" />
                            )}
                            {isUltra ? t("FocusWholeRoutine") : t("FocusOneAtATime")}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={leave}
                        aria-label={t("FocusExit")}
                        title={t("FocusExit")}
                        className={`flex h-9 w-9 items-center justify-center rounded-control text-text-2 transition-colors hover:bg-surface-2 hover:text-text ${routine ? "" : "ml-auto"}`}
                        data-testid="focus-exit"
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </header>

                {/* Plain block rather than `ErrorNotice`: that component takes an
                    `ApiErrorPayload`, and `getTodayRoutine` resolves its failure to a
                    translated string. Said inline instead of as a toast because the whole
                    screen is what failed to load, and without it a routine that never
                    arrived renders as "nothing scheduled today". */}
                {error && (
                    <div
                        role="alert"
                        className="mb-4 rounded-card border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-text"
                        data-testid="focus-error"
                    >
                        {error}
                    </div>
                )}

                {loading ? (
                    <div
                        className="flex flex-1 items-center justify-center"
                        data-testid="focus-loading"
                    >
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-border border-t-transparent" />
                    </div>
                ) : (
                    /* The routine card is skipped entirely when the fetch failed with nothing
                       cached: `RoutineDay` given null draws "nothing scheduled today", which
                       is a different and wrong statement about a day whose routine we simply
                       could not read. */
                    (routine || !error) &&
                    (isUltra && routine ? (
                        <Ultrafoco routine={routine} />
                    ) : (
                        <RoutineDay routine={routine} />
                    ))
                )}
            </div>
        </div>
    );
}
