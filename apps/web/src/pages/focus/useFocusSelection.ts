import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { Routine } from "@beyou/types/routine/routine";
import type { RootState } from "@beyou/state/rootReducer";
import {
    focusItemSelected,
    focusMovedBy,
    focusStartResolved,
    getFocusItems,
    minutesOfDay,
    resolveFocusStart,
    type FocusItem,
} from "@beyou/state";

/**
 * The ultrafoco's selection: which item is on screen, and who chose it.
 *
 * The native twin is `apps/mobile/src/focus/useFocusSelection.ts`. Kept per-app on purpose:
 * `@beyou/state` has no React dependency at all, and this monorepo deliberately runs two
 * React versions side by side (19 on mobile, 18 on web), so a hook in the shared package
 * would introduce exactly the dependency the setup is arranged to avoid. What matters is
 * shared anyway: `getFocusItems`, `resolveFocusStart`, and the reducer's refusal to overwrite
 * a manual choice. Only the wiring is written twice.
 *
 * How the clock and the person share control:
 *
 *  - On mount, and whenever the set of items changes, the resolver's suggestion is offered
 *    through `focusStartResolved`. The reducer applies it only while nothing has been chosen
 *    by hand, so this is a seed and never an override.
 *  - `select`, `next` and `previous` all mark the selection manual. From then on the clock is
 *    out of it for the rest of the visit.
 *
 * `reason` keeps coming from the clock even after a manual move, because it describes the item
 * on screen rather than the choice: an item picked by hand at nine still truthfully reads
 * "next up" until its window opens.
 */
export function useFocusSelection(routine: Routine | null, date: string) {
    const dispatch = useDispatch();
    const selectedIndex = useSelector((state: RootState) => state.focus.selectedIndex);
    const manuallySelected = useSelector((state: RootState) => state.focus.manuallySelected);

    const items = useMemo(() => getFocusItems(routine), [routine]);

    // Keyed on the ids, not on the array. A check rewrites the routine object on every
    // response, and re-running the seed on that would re-offer the clock's pick constantly.
    // Harmless once the choice is marked manual, but wrong in the window before it is.
    const identity = useMemo(() => items.map((item) => item.groupId).join("|"), [items]);

    // The clock has to keep moving, or the badge lies. Resolved once at mount, an item sitting
    // at 11:59 still read "next up" at 12:01 with its window already open. Ticking also makes
    // the reducer's manual-selection guard load-bearing rather than decorative: the resolver
    // now genuinely re-offers a different index, and the guard is what refuses it.
    const [nowMinutes, setNowMinutes] = useState(() => minutesOfDay(new Date()));

    useEffect(() => {
        // Half a minute, so a window opening is noticed within 30s. Setting the same number
        // re-renders nothing, so most ticks cost a comparison.
        const id = setInterval(() => setNowMinutes(minutesOfDay(new Date())), 30_000);
        return () => clearInterval(id);
    }, []);

    const resolved = useMemo(
        () => resolveFocusStart(items, nowMinutes, date),
        // `identity` stands in for `items`: same contents, stable across check responses.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [identity, date, nowMinutes]
    );

    // Offered, not imposed. `focusStartResolved` is a no-op once the person has chosen, so this
    // firing every time the clock's answer changes is exactly the intended behaviour.
    useEffect(() => {
        dispatch(focusStartResolved(resolved.index));
    }, [dispatch, resolved.index]);

    const index = selectedIndex >= 0 && selectedIndex < items.length ? selectedIndex : -1;
    const current: FocusItem | null = index >= 0 ? items[index] : null;

    const step = useCallback(
        (delta: number) => {
            dispatch(focusMovedBy({ delta, count: items.length }));
        },
        [dispatch, items.length]
    );

    const select = useCallback(
        (next: number) => {
            dispatch(focusItemSelected(next));
        },
        [dispatch]
    );

    return {
        items,
        current,
        index,
        reason: resolved.reason,
        manuallySelected,
        select,
        next: useCallback(() => step(1), [step]),
        previous: useCallback(() => step(-1), [step]),
        canGoNext: index >= 0 && index < items.length - 1,
        canGoPrevious: index > 0,
    };
}
