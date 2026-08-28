import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
  BREAK_DEFAULT_MINUTES,
  formatRemaining,
  nextCycleKind,
  pomodoroAbandoned,
  pomodoroCycleCompleted,
  pomodoroPaused,
  pomodoroResumed,
  pomodoroStarted,
  remainingMs,
  timerStatus,
  type CycleKind,
} from '@beyou/state';
import { armCycleEndNotification, cancelCycleEndNotification } from './notifyCycleEnd';
import type { RootState, AppDispatch } from '../store';

const KEEP_AWAKE_TAG = 'beyou-focus';

/**
 * The pomodoro, ticking, on native.
 *
 * The web twin is `apps/web/src/pages/focus/usePomodoro.ts`, per-app for the same reason as
 * `useFocusSelection`: `@beyou/state` holds no React. Everything that decides anything is
 * shared — the reducer, `remainingMs`, `timerStatus`, `formatRemaining`. What differs is the
 * two platform effects, and on native they are the ones that make the timer real:
 *
 *  - **keep-awake** while a cycle runs, so the screen does not go dark on somebody watching it.
 *  - **a scheduled local notification**, because a JS interval stops dead when the app is
 *    backgrounded or the phone locks. `endsAt` and the notification trigger are the same fact
 *    handed to two schedulers, which is why the countdown can be wrong-by-suspension and the
 *    alert still lands on time.
 *
 * Nothing counts down in a variable. The tick exists only to re-render; the number shown is
 * always `endsAt` minus the wall clock.
 */
export function usePomodoro(groupId: string | null, date: string) {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const timer = useSelector((s: RootState) => s.focus.timer);
  const [now, setNow] = useState(() => Date.now());

  const status = timerStatus(timer, now);
  const remaining = remainingMs(timer, now);

  // One second while it runs, nothing otherwise.
  useEffect(() => {
    if (status !== 'running') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status]);

  // Crossing zero is derived from the clock rather than armed with a setTimeout: a timeout does
  // not survive the suspension this design exists to survive, and could not be trusted to fire.
  useEffect(() => {
    if (status === 'elapsed' && timer && !timer.finished) {
      dispatch(pomodoroCycleCompleted());
    }
  }, [status, timer, dispatch]);

  // Screen stays on for the length of a cycle, and only for that. Released on pause, on stop,
  // and on unmount, so a forgotten cycle cannot hold the display awake indefinitely.
  useEffect(() => {
    if (status !== 'running') return;
    void activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {
      /* unsupported platform: the cycle still runs, the screen just dims */
    });
    return () => {
      try {
        deactivateKeepAwake(KEEP_AWAKE_TAG);
      } catch {
        /* never activated */
      }
    };
  }, [status]);

  // Armed on the exact `endsAt` the reducer holds, and taken back the moment the cycle stops
  // being a running cycle. Keyed on endsAt so a resume re-arms at the new moment.
  useEffect(() => {
    if (status !== 'running' || !timer) {
      void cancelCycleEndNotification();
      return;
    }
    void armCycleEndNotification(timer.endsAt, {
      title: timer.kind === 'break' ? t('FocusBreakCycle') : t('FocusWorkCycle'),
      message: t('FocusCycleDone'),
    });
    return () => {
      void cancelCycleEndNotification();
    };
  }, [status, timer?.endsAt, timer?.kind, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback(
    (minutes: number, kind: CycleKind = 'work') => {
      if (!groupId) return;
      dispatch(pomodoroStarted({ groupId, kind, minutes, now: Date.now(), date }));
      setNow(Date.now());
    },
    [dispatch, groupId, date],
  );

  return {
    timer,
    status,
    remaining,
    formatted: formatRemaining(remaining),
    cycles: timer?.completedCycles ?? 0,
    kind: (timer?.kind ?? 'work') as CycleKind,
    nextMinutes:
      timer && nextCycleKind(timer.kind) === 'break'
        ? BREAK_DEFAULT_MINUTES
        : (timer?.durationMinutes ?? null),
    start,
    pause: useCallback(() => dispatch(pomodoroPaused({ now: Date.now() })), [dispatch]),
    /**
     * Refreshes `now` alongside the dispatch, exactly as `start` does. Without it the display
     * was briefly wrong in the alarming direction: resume recomputes `endsAt` from the current
     * clock while the hook's `now` was still pre-pause, so a 24:00 cycle resumed after twenty
     * minutes away rendered 44:00 until the next tick.
     */
    resume: useCallback(() => {
      dispatch(pomodoroResumed({ now: Date.now() }));
      setNow(Date.now());
    }, [dispatch]),
    stop: useCallback(() => dispatch(pomodoroAbandoned()), [dispatch]),
  };
}
