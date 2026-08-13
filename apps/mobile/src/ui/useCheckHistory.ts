import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import getCheckHistory from '@beyou/api/checkHistory/getCheckHistory';
import { todayInZone } from '@beyou/state';
import type { CheckDay, CheckDayOwnerType } from '@beyou/types/checkday/checkHistory';
import type { RootState } from '../store';

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
  const timezone = useSelector((s: RootState) => s.perfil.timezone);
  const [days, setDays] = useState<CheckDay[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getCheckHistory({ ownerType, ownerId, from, to }, t).then((response) => {
      if (cancelled) return;
      if (response.success) {
        setDays(response.success.days ?? []);
      } else {
        setError(response.error ?? t('UnexpectedError'));
        setDays([]);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [ownerType, ownerId, from, to, enabled, t]);

  const today = useMemo(() => todayInZone(timezone), [timezone]);

  return { days, loading, error, today };
}
