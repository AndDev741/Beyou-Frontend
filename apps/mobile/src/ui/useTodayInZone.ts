import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { msUntilNextMidnight, todayInZone } from '@beyou/state';
import type { RootState } from '../store';

/**
 * Today in the user's timezone, re-read when the day actually turns. Mirror of the
 * web hook, and it matters more here: a phone app is left open for days.
 *
 * Memoizing on the timezone alone kept a long-lived screen reporting yesterday as
 * today, so the "still open" ring stuck to the wrong square and every derived
 * `from`/`to` window kept asking the server for a stale range.
 */
export default function useTodayInZone(): string {
  const timezone = useSelector((s: RootState) => s.perfil.timezone);
  const [turn, setTurn] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setTurn((previous) => previous + 1), msUntilNextMidnight(timezone));
    return () => clearTimeout(id);
    // `turn` re-arms the timer for the following day.
  }, [timezone, turn]);

  return useMemo(() => todayInZone(timezone), [timezone, turn]);
}
