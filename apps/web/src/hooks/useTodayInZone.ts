import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { msUntilNextMidnight, todayInZone } from "@beyou/state";
import type { RootState } from "@beyou/state/rootReducer";

/**
 * Today in the user's timezone, re-read when the day actually turns.
 *
 * Memoizing on the timezone alone was wrong in a way that only shows up hours
 * later: a dashboard left open across local midnight kept reporting yesterday as
 * today, so the "still open" ring stuck to the wrong square — and every caller that
 * derives a `from`/`to` window from this kept asking the server for the stale range,
 * refetch or no refetch.
 *
 * One timer, re-armed on each turn. The zone comes from the profile because the
 * backend keys a day by the USER's zone, which is not always the browser's.
 */
export default function useTodayInZone(): string {
    const timezone = useSelector((state: RootState) => state.perfil.timezone);
    const [turn, setTurn] = useState(0);

    useEffect(() => {
        const id = setTimeout(() => setTurn((previous) => previous + 1), msUntilNextMidnight(timezone));
        return () => clearTimeout(id);
        // `turn` re-arms the timer for the following day.
    }, [timezone, turn]);

    return useMemo(() => todayInZone(timezone), [timezone, turn]);
}
