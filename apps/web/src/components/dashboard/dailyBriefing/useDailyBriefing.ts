import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useStore } from "react-redux";
import { getDailyBriefing, markBriefingSeen } from "@beyou/api";
import { checkSnapshotItem, skipSnapshotItem } from "@beyou/api/routine/snapshot";
import { resolveOpenItem, shouldOpenBriefing } from "@beyou/state";
import type { DailyBriefing, BriefingOpenItem } from "@beyou/types/briefing/briefing";
import { applyRefreshUi } from "@beyou/state/user/refreshUiThunk";
import type { RootState } from "@beyou/state/rootReducer";
import { logger } from "../../../utils/logger";

type Options = {
    /** True while the tutorial or the AI wizard owns the dashboard. */
    tutorialActive: boolean;
    /** Called after a retroactive check, so the dashboard picks up the new totals. */
    onResolved?: () => void;
};

/**
 * Loads the day's briefing and owns everything the dialog can do to it.
 *
 * The fetch is deliberately not gated on anything: the dashboard renders first and this
 * arrives when it arrives. The first call of a user's day can take several seconds because
 * the server may be waiting on the model that writes the prose, and the dialog is designed
 * to open without it.
 *
 * Resolving an item is optimistic. The row leaves the list under the user's finger through
 * `resolveOpenItem`, and the server's `RefreshUiDTO` goes into the shared gamification path
 * so XP, levels and celebrations behave exactly as they do on the dashboard itself. A failed
 * request puts the row back, because a row that vanished without being recorded is the one
 * outcome the user cannot detect on their own.
 */
export function useDailyBriefing({ tutorialActive, onResolved }: Options) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const store = useStore<RootState>();
    const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
    const [loading, setLoading] = useState(true);
    const [dismissed, setDismissed] = useState(false);
    const [pendingId, setPendingId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        getDailyBriefing(t)
            .then((result) => {
                if (cancelled) return;
                // A failed briefing is silence, not a toast. Nobody asked for this request,
                // and an error about a dialog the user has not seen is pure noise.
                if (result.success) setBriefing(result.success);
                else logger.warn("Daily briefing unavailable", result.error);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [t]);

    const open = !loading && shouldOpenBriefing({
        briefing,
        tutorialActive,
        dismissedThisSession: dismissed,
    });

    const close = useCallback(() => {
        setDismissed(true);
        // Fire and forget. The dialog closes on the click, not on the round trip; a failure
        // means it may open once more on another device, which beats a close button that
        // spins.
        void markBriefingSeen(t);
    }, [t]);

    const resolve = useCallback(
        async (item: BriefingOpenItem, outcome: "checked" | "skipped") => {
            if (!briefing || pendingId) return;
            const previous = briefing;
            setPendingId(item.snapshotCheckId);
            setBriefing(resolveOpenItem(briefing, item.snapshotCheckId, outcome));

            const call = outcome === "checked" ? checkSnapshotItem : skipSnapshotItem;
            const result = await call(item.snapshotId, item.snapshotCheckId, t);

            setPendingId(null);
            if (result.success) {
                // The same path the dashboard's own check-ins use, so XP, levels and
                // category totals land identically. `skipCelebrations` because every check
                // reachable from here is retroactive, and confetti for a day that already
                // ended reads as the app not knowing what day it is. SnapshotRoutineCard
                // makes the same call for the same reason.
                const previous = store.getState().perfil;
                applyRefreshUi(result.success, dispatch, previous, { skipCelebrations: true });
                onResolved?.();
                return;
            }
            logger.warn("Retroactive check failed", result.error);
            setBriefing(previous);
        },
        [briefing, pendingId, t, dispatch, store, onResolved],
    );

    return { briefing, open, close, resolve, pendingId };
}
