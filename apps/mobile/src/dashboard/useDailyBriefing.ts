import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useStore } from 'react-redux';
import { getBriefingNarrative, getDailyBriefing, markBriefingSeen } from '@beyou/api';
import { checkSnapshotItem, skipSnapshotItem } from '@beyou/api/routine/snapshot';
import { pollNarrative, resolveOpenItem, shouldOpenBriefing, withNarrative } from '@beyou/state';
import { applyRefreshUi } from '@beyou/state/user/refreshUiThunk';
import type { DailyBriefing, BriefingOpenItem } from '@beyou/types/briefing/briefing';
import type { AppDispatch, RootState } from '../store';

interface Options {
  /** True while the tutorial or the AI wizard owns the screen. */
  tutorialActive: boolean;
  /** The user asked for it back from the configuration screen. */
  forceOpen?: boolean;
  /**
   * Called once when the sheet closes, if anything was checked or skipped inside it, so the
   * dashboard picks up the new totals.
   */
  onResolved?: () => void;
  /** Called when the user closes it, so a caller can drop a `forceOpen` request. */
  onClosed?: () => void;
}

/**
 * The native twin of `apps/web/src/components/dashboard/dailyBriefing/useDailyBriefing.ts`.
 *
 * Deliberately the same shape: fetch without gating anything on it, decide whether to open
 * through the shared `shouldOpenBriefing`, resolve items optimistically through the shared
 * `resolveOpenItem`, and push the server's `RefreshUiDTO` into `applyRefreshUi` with
 * `skipCelebrations` because every check reachable from here is retroactive. The prose that
 * arrives after the server's deadline is fetched by the shared `pollNarrative` while the
 * sheet is up, and the dashboard reloads once on close rather than once per check, for the
 * read budget's sake.
 *
 * The rules live in `@beyou/state` rather than being written twice. What is left here is the
 * wiring, which is the only part that genuinely differs between a browser and a phone.
 */
export function useDailyBriefing({
  tutorialActive,
  forceOpen = false,
  onResolved,
  onClosed,
}: Options) {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const resolvedSinceOpen = useRef(false);

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
    shouldOpenBriefing({ briefing, tutorialActive, dismissedThisSession: dismissed, forceOpen });

  const narrativePending = briefing?.narrative?.status === 'PENDING';
  useEffect(() => {
    if (!visible || !narrativePending) return;
    return pollNarrative(
      () => getBriefingNarrative(t).then((result) => result.success ?? null),
      (narrative) => setBriefing((current) => (current ? withNarrative(current, narrative) : current)),
    );
  }, [visible, narrativePending, t]);

  const close = useCallback(() => {
    setDismissed(true);
    onClosed?.();
    if (resolvedSinceOpen.current) {
      resolvedSinceOpen.current = false;
      onResolved?.();
    }
    void markBriefingSeen(t);
  }, [t, onClosed, onResolved]);

  const resolve = useCallback(
    async (item: BriefingOpenItem, outcome: 'checked' | 'skipped') => {
      if (!briefing || pendingId) return;
      const previous = briefing;
      setPendingId(item.snapshotCheckId);
      setBriefing((current) =>
        current ? resolveOpenItem(current, item.snapshotCheckId, outcome) : current,
      );

      const call = outcome === 'checked' ? checkSnapshotItem : skipSnapshotItem;
      const result = await call(item.snapshotId, item.snapshotCheckId, t);

      setPendingId(null);
      if (result.success) {
        applyRefreshUi(result.success, dispatch, store.getState().perfil, {
          skipCelebrations: true,
        });
        resolvedSinceOpen.current = true;
        return;
      }
      // A row that vanished without being recorded is the one outcome the user cannot
      // detect on their own, so it comes back. Prose that landed meanwhile stays.
      setBriefing((current) => (current ? withNarrative(previous, current.narrative) : previous));
    },
    [briefing, pendingId, t, dispatch, store],
  );

  return { briefing, visible, close, resolve, pendingId };
}
