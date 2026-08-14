import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import getCheckHistory from '@beyou/api/checkHistory/getCheckHistory';
import type { CheckDay, CheckDayOwnerType } from '@beyou/types/checkday/checkHistory';
import type { RootState } from '../store';
import useTodayInZone from './useTodayInZone';

interface UseCheckHistoryArgs {
  ownerType: CheckDayOwnerType;
  /** Optional only for `USER`. */
  ownerId?: string;
  /** `yyyy-MM-dd`. Leave both out for the endpoint's default: 28 days to the owner's today. */
  from?: string;
  to?: string;
  /** Gate for the lazy case — a habit card fetches when it opens, not when the list renders. */
  enabled?: boolean;
}

interface UseCheckHistoryResult {
  days: CheckDay[];
  loading: boolean;
  error: string | null;
  /** Today in the USER's timezone, which decides which square is still open. */
  today: string;
  /**
   * The EFFECTIVE range the server answered with — clamped when the request was
   * wider than the cap. Render from these, never from the request parameters.
   */
  from: string | null;
  to: string | null;
}

/**
 * One `GET /check-history` call, kept in component state. Mirror of the web hook.
 *
 * Args are primitives so the effect's dependencies ARE the query: an object literal
 * from a render would refetch on every unrelated state change on the screen.
 */
export default function useCheckHistory({
  ownerType,
  ownerId,
  from,
  to,
  enabled = true,
}: UseCheckHistoryArgs): UseCheckHistoryResult {
  const { t } = useTranslation();
  const today = useTodayInZone();
  // Re-reads after every check: the response moves the number, and a strip that
  // fetched once on mount would keep drawing today as still open. The same value
  // rides the request's dedup key, so a post-check read never joins a pre-check
  // request that happens to still be in flight.
  const checkRevision = useSelector((s: RootState) => s.perfil.checkRevision);
  const [days, setDays] = useState<CheckDay[]>([]);
  const [range, setRange] = useState<{ from: string | null; to: string | null }>({
    from: null,
    to: null,
  });
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getCheckHistory({ ownerType, ownerId, from, to }, t, checkRevision).then((response) => {
      if (cancelled) return;
      if (response.success) {
        setDays(response.success.days ?? []);
        setRange({ from: response.success.from ?? null, to: response.success.to ?? null });
      } else {
        setError(response.error ?? t('UnexpectedError'));
        setDays([]);
        setRange({ from: null, to: null });
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [ownerType, ownerId, from, to, enabled, checkRevision, t]);

  return { days, loading, error, today, from: range.from, to: range.to };
}
