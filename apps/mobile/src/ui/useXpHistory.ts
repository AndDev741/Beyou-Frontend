import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import getXpHistory from '@beyou/api/xp/getXpHistory';
import { xpSeriesFor } from '@beyou/state';
import type { XpHistory, XpOwnerType } from '@beyou/types/xp/xpHistory';
import type { RootState } from '../store';

interface UseXpHistoryResult {
  /** The x axis, ISO days oldest first. Undefined until the first answer. */
  days: string[] | undefined;
  /** One owner's values; zeros when the window has nothing for it; undefined before the response. */
  seriesFor: (ownerType: XpOwnerType, ownerId: string) => number[] | undefined;
  loading: boolean;
}

/**
 * One `GET /xp/history` call for the screen, kept in component state. The web asks
 * once per page (dashboard, categories) and hands each widget or card its slice;
 * this hook is that once.
 *
 * Re-reads on `checkRevision`, as the check strips do: a check-in moves today's bar,
 * and a series fetched once on mount would keep drawing the day as it was.
 */
export default function useXpHistory(days = 7): UseXpHistoryResult {
  const { t } = useTranslation();
  const checkRevision = useSelector((s: RootState) => s.perfil.checkRevision);
  const [history, setHistory] = useState<XpHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getXpHistory(t, days).then((response) => {
      if (cancelled) return;
      setHistory(response.success ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [days, checkRevision, t]);

  // The rule (own week, or zeros once the response is in, or nothing yet) is shared
  // with the web in @beyou/state, so the two dashboards cannot drift on it.
  const seriesFor = useCallback(
    (ownerType: XpOwnerType, ownerId: string) => xpSeriesFor(history, ownerType, ownerId),
    [history],
  );

  return { days: Array.isArray(history?.days) ? history.days : undefined, seriesFor, loading };
}
