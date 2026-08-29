import { useCallback } from "react";
import { useDispatch, useStore } from "react-redux";
import { useTranslation } from "react-i18next";
import checkRoutine from "@beyou/api/routine/checkItem";
import skipRoutine from "@beyou/api/routine/skipItem";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import { applyRefreshUi } from "@beyou/state/user/refreshUiThunk";
import type { itemGroupToCheck } from "@beyou/types/routine/itemGroupToCheck";
import type { itemGroupToSkip } from "@beyou/types/routine/itemGroupToSkip";
import type { RefreshUI } from "@beyou/types/refreshUi/refreshUi.type";
import type { RootState } from "@beyou/state/rootReducer";
import { notify } from "../lib/notify";

type CheckOpts = {
    /** True when the press is an UNcheck, so the success notification is suppressed. */
    wasChecked?: boolean;
    /** The item's name. Becomes the notification title. */
    name?: string;
    /** The habit's phrase, as the second line. */
    motivationalPhrase?: string;
};

/**
 * Check or skip one routine item group, and apply what comes back.
 *
 * The native twin is `apps/mobile/src/dashboard/useRoutineCheckin.ts`, and this is
 * deliberately the same shape: call the endpoint, then push the `RefreshUI` through the
 * shared `applyRefreshUi` (perfil, categories, the item group, celebrations), reading the
 * previous perfil right before applying so the celebration diff is computed against the
 * state the check actually started from.
 *
 * `applyRefreshUi` rather than `useUiRefresh`: that hook is a thin effect around the same
 * call, and an effect is the wrong tool when the caller already knows the exact moment the
 * response arrived.
 *
 * **`routineSection.tsx` keeps its own handlers rather than using this.** Its check is wired
 * into local component state (the `xpFloats` map keyed by group id, and a `refreshUi` piece
 * of state that feeds `useUiRefresh`), so moving it here would mean reshaping how the floats
 * are driven, on the one path the e2e suite guards most closely. Worth doing, not worth doing
 * inside this feature.
 */
export function useRoutineCheckin() {
    const dispatch = useDispatch();
    const store = useStore<RootState>();
    const { t } = useTranslation();

    const apply = useCallback(
        (refresh: RefreshUI) => {
            const previous = store.getState().perfil;
            applyRefreshUi(refresh, dispatch, previous);
        },
        [dispatch, store]
    );

    const check = useCallback(
        async (dto: itemGroupToCheck, opts: CheckOpts = {}): Promise<RefreshUI | null> => {
            const response = await checkRoutine(dto, t);
            if (response?.success) {
                apply(response.success);
                // Only on a fresh check. Unchecking is a correction, and congratulating
                // somebody for undoing something reads as sarcasm.
                if (!opts.wasChecked) {
                    // The item's own name and phrase, matching the native hook exactly: a
                    // generic "done" does not say WHAT got done.
                    notify.success(opts.name || t("Item completed"), {
                        subtitle: opts.motivationalPhrase,
                    });
                }
                return response.success;
            }
            notify.error(getFriendlyErrorMessage(t, response?.error));
            return null;
        },
        [apply, t]
    );

    const skip = useCallback(
        async (dto: itemGroupToSkip): Promise<RefreshUI | null> => {
            const response = await skipRoutine(dto, t);
            if (response?.success) {
                apply(response.success);
                return response.success;
            }
            notify.error(getFriendlyErrorMessage(t, response?.error));
            return null;
        },
        [apply, t]
    );

    return { check, skip };
}
