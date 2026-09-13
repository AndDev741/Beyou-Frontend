import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useStore } from 'react-redux';
import { getDailyBriefing, markBriefingSeen } from '@beyou/api';
import { checkSnapshotItem, skipSnapshotItem } from '@beyou/api/routine/snapshot';
import { resolveOpenItem, shouldOpenBriefing } from '@beyou/state';
import { applyRefreshUi } from '@beyou/state/user/refreshUiThunk';
import type { DailyBriefing, BriefingOpenItem } from '@beyou/types/briefing/briefing';
import type { AppDispatch, RootState } from '../store';

interface Options {
  /** True while the tutorial or the AI wizard owns the screen. */
  tutorialActive: boolean;
  onResolved?: () => void;
}

/**
 * The native twin of `apps/web/src/components/dashboard/dailyBriefing/useDailyBriefing.ts`.
 *
 * Deliberately the same shape: fetch without gating anything on it, decide whether to open
 * through the shared `shouldOpenBriefing`, resolve items optimistically through the shared
 * `resolveOpenItem`, and push the server's `RefreshUiDTO` into `applyRefreshUi` with
 * `skipCelebrations` because every check reachable from here is retroactive.
 *
 * The rules live in `@beyou/state` rather than being written twice. What is left here is the
 * wiring, which is the only part that genuinely differs between a browser and a phone.
 */
export function useDailyBriefing({ tutorialActive, onResolved }: Options) {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
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
        // Silence on failure, and not even a log line. Nobody asked for this request; the
        // shared Logger only exposes `error`, which routes to the telemetry collector, and a
        // briefing that did not load is not an incident — the dialog simply does not open.
        // The server logs its own side.
        if (result.success) setBriefing(result.success);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const visible =
    !loading &&
    shouldOpenBriefing({ briefing, tutorialActive, dismissedThisSession: dismissed });

  const close = useCallback(() => {
    setDismissed(true);
    void markBriefingSeen(t);
  }, [t]);

  const resolve = useCallback(
    async (item: BriefingOpenItem, outcome: 'checked' | 'skipped') => {
      if (!briefing || pendingId) return;
      const previous = briefing;
      setPendingId(item.snapshotCheckId);
      setBriefing(resolveOpenItem(briefing, item.snapshotCheckId, outcome));

      const call = outcome === 'checked' ? checkSnapshotItem : skipSnapshotItem;
      const result = await call(item.snapshotId, item.snapshotCheckId, t);

      setPendingId(null);
      if (result.success) {
        applyRefreshUi(result.success, dispatch, store.getState().perfil, {
          skipCelebrations: true,
        });
        onResolved?.();
        return;
      }
      // A row that vanished without being recorded is the one outcome the user cannot
      // detect on their own, so it comes back.
      setBriefing(previous);
    },
    [briefing, pendingId, t, dispatch, store, onResolved],
  );

  return { briefing, visible, close, resolve, pendingId };
}
