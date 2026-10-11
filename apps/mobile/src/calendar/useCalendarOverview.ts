import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCalendarOverview } from '@beyou/api/calendar/calendarApi';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { removeTaskFromOverview, upsertTaskInOverview } from '@beyou/state';
import type { CalendarOverview, CalendarTask } from '@beyou/types/calendar/calendar';

export interface UseCalendarOverviewResult {
  overview: CalendarOverview | null;
  /** True while a request for the current range is in flight. */
  loading: boolean;
  /** The last failure, already translated, or null. */
  error: string | null;
  /** Asks for the same range again. Resolves once the answer is applied. */
  reload: () => Promise<void>;
  /** Puts a task the screen just wrote into the overview, on its own day. */
  applyTask: (task: CalendarTask) => void;
  removeTask: (id: string) => void;
}

/**
 * One `GET /calendar?from&to` for the visible range, held in component state.
 *
 * No Redux slice, by design (KTD8): the data is per range and nothing else on the phone reads
 * it, so a slice would be a cache with nobody to share it with. The screen applies its own
 * writes through `applyTask`/`removeTask` instead of refetching the whole range.
 *
 * A request that comes back after the range moved on is dropped, so flicking through months
 * quickly cannot paint an older month over the one on screen.
 */
export default function useCalendarOverview(
  from: string,
  to: string,
  enabled = true,
): UseCalendarOverviewResult {
  const { t } = useTranslation();
  const [overview, setOverview] = useState<CalendarOverview | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  const reload = useCallback(async () => {
    const request = ++latest.current;
    setLoading(true);
    const response = await getCalendarOverview({ from, to }, t);
    if (request !== latest.current) return;
    if (response.success) {
      setOverview(response.success);
      setError(null);
    } else {
      setError(getFriendlyErrorMessage(t, response.error));
    }
    setLoading(false);
  }, [from, to, t]);

  useEffect(() => {
    if (!enabled) return;
    void reload();
  }, [enabled, reload]);

  // A request still in flight when the screen goes must not land on it afterwards.
  useEffect(
    () => () => {
      latest.current += 1;
    },
    [],
  );

  const applyTask = useCallback((task: CalendarTask) => {
    setOverview((current) => (current ? upsertTaskInOverview(current, task) : current));
  }, []);

  const removeTask = useCallback((id: string) => {
    setOverview((current) => (current ? removeTaskFromOverview(current, id) : current));
  }, []);

  return { overview, loading, error, reload, applyTask, removeTask };
}
