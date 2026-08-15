import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  createDayWatcher,
  createRefreshRunner,
  type RefreshReason,
} from '@beyou/state/sync/autoRefresh';

/** How often the screen looks up from what it is doing. Not how often it refetches. */
const TICK_MS = 60_000;

/** The slowest a screen in view is allowed to be out of date without another prompt. */
const DEFAULT_INTERVAL_MS = 5 * 60_000;

export type AutoRefreshOptions = {
  /** Time-based refresh while the screen is in view. 0 relies on the other prompts. */
  intervalMs?: number;
  /** False parks the whole thing: no timer, no listeners, no requests. */
  enabled?: boolean;
  /** Asked immediately before each run — say false while something is mid-flight. */
  canRun?: () => boolean;
};

/**
 * Keeps the screen in view current, without the user asking.
 *
 * Coming back means two different things on a phone and both matter here. The app
 * returning from the background is `AppState`. Returning to a screen that never
 * unmounted is `useFocusEffect`, and that one is not optional: navigation is a `Stack`
 * driven by `router.push`, so screens underneath stay mounted and their load effects
 * never run again. Without this, walking to Habits and back left the dashboard showing
 * whatever it had when the app started — on one device, with nobody else involved.
 *
 * The day turning over is the case that made this worth building: tick off the day's
 * routine, sleep, open the app on the same screen, and yesterday is still there with
 * every box checked. It is a string comparison against the local calendar day with no
 * network in it, so it can run every minute; the backend derives its own today from
 * the account's timezone, so all this has to do is ask again.
 *
 * Time passing is the catch-all for a screen held open while the web writes to the
 * same account. Slow on purpose: reads are capped at 60/minute per user and a
 * dashboard load spends six of them.
 *
 * Nothing runs while the screen is out of view or the app is in the background.
 */
export function useAutoRefresh(
  refresh: (reason: RefreshReason) => Promise<unknown>,
  options: AutoRefreshOptions = {},
): void {
  const { intervalMs = DEFAULT_INTERVAL_MS, enabled = true, canRun } = options;

  // Through refs so a caller can pass an inline arrow without re-arming everything on
  // every render.
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const canRunRef = useRef(canRun);
  canRunRef.current = canRun;

  const runnerRef = useRef<ReturnType<typeof createRefreshRunner> | null>(null);
  const dayRef = useRef<ReturnType<typeof createDayWatcher> | null>(null);
  const lastRefreshAt = useRef(Date.now());
  const focused = useRef(false);

  if (runnerRef.current === null) {
    runnerRef.current = createRefreshRunner((reason) => refreshRef.current(reason), {
      canRun: () => (canRunRef.current ? canRunRef.current() : true),
      // Dev only, and deliberately not the shared logger: that one reports to Sentry,
      // and a background refresh losing to a flaky network is not a bug anybody should
      // be paged about. The user is not told either — see createRefreshRunner.
      onError: (error, reason) => {
        if (__DEV__) console.warn(`Background refresh (${reason}) failed`, error);
      },
    });
    dayRef.current = createDayWatcher();
  }

  const request = useCallback((reason: RefreshReason) => {
    void runnerRef.current?.request(reason).then((ran) => {
      if (ran) lastRefreshAt.current = Date.now();
    });
  }, []);

  // Returning to this screen in the stack. Skipped on the very first focus, where the
  // screen's own load effect has just run and a second round would be pure waste.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      if (!enabled) return () => { focused.current = false; };
      if (firstFocus.current) {
        firstFocus.current = false;
      } else {
        request(dayRef.current?.hasFlipped() ? 'dayChange' : 'foreground');
      }
      return () => {
        focused.current = false;
      };
    }, [enabled, request]),
  );

  useEffect(() => {
    if (!enabled) return;

    const onAppState = (state: AppStateStatus) => {
      if (state !== 'active' || !focused.current) return;
      // The day may well have turned while the app was away. Consuming the flip here
      // keeps the tick below from asking again for the same reason.
      request(dayRef.current?.hasFlipped() ? 'dayChange' : 'foreground');
    };

    const subscription = AppState.addEventListener('change', onAppState);

    const timer = setInterval(() => {
      if (!focused.current || AppState.currentState !== 'active') return;
      if (dayRef.current?.hasFlipped()) {
        request('dayChange');
        return;
      }
      if (intervalMs > 0 && Date.now() - lastRefreshAt.current >= intervalMs) {
        request('interval');
      }
    }, TICK_MS);

    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [enabled, intervalMs, request]);
}
