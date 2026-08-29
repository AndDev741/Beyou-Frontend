import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { recordFocusCycle } from '@beyou/api/focus/focusApi';
import { CYCLE_LABEL_KEY, pomodoroCycleCompleted, timerStatus, toServerCycleKind } from '@beyou/state';
import { armCycleEndNotification, cancelCycleEndNotification } from './notifyCycleEnd';
import type { RootState, AppDispatch } from '../store';

/**
 * The one place a cycle is allowed to finish, on native. Twin of the web component.
 *
 * Mounted in the root layout, so it lives for as long as the app does, on the focus screen and
 * off it. Two things moved here from `usePomodoro`, which only mounts inside the Ultrafoco panel:
 *
 *  - **completion**: noticing the clock cross zero, reporting the cycle once, handing over. Done in
 *    the panel it was lost whenever the person toggled to "whole routine" or left the screen, and
 *    the cycle was dropped outright if the day turned before they came back.
 *  - **the scheduled notification**: the panel armed it on start and CANCELLED it on unmount, so
 *    leaving the screen took back the very alert that exists for when the screen is not in front
 *    of you. Owned here it follows the timer, not the panel.
 *
 * Keep-awake stays in the panel on purpose: holding the screen on is about the screen you are
 * looking at, and should stop when you look at something else.
 */
export default function PomodoroOwner() {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const timer = useSelector((s: RootState) => s.focus.timer);
  const [now, setNow] = useState(() => Date.now());

  const status = timerStatus(timer, now);

  useEffect(() => {
    if (status !== 'running') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status]);

  // Reported from the timer's own fields BEFORE the reducer hands over — after the dispatch,
  // `kind` is already the break. Fire-and-forget. Never runs for a skipped or abandoned cycle:
  // `finished` is already set by then, or the timer is gone.
  useEffect(() => {
    if (status === 'elapsed' && timer && !timer.finished) {
      void recordFocusCycle(
        {
          itemGroupId: timer.groupId || null,
          kind: toServerCycleKind(timer.kind),
          startedAt: new Date(timer.startedAt).toISOString(),
          endedAt: new Date(timer.endsAt).toISOString(),
          minutes: timer.durationMinutes,
        },
        t,
      );
      dispatch(pomodoroCycleCompleted());
    }
  }, [status, timer, dispatch, t]);

  // Armed on the exact `endsAt` the reducer holds, taken back the moment the cycle stops being a
  // running one (pause, stop, skip, hand-over). Keyed on endsAt so a resume re-arms at the new
  // moment. There is no cleanup on unmount by design: this component unmounts only with the app.
  useEffect(() => {
    if (status !== 'running' || !timer) {
      void cancelCycleEndNotification();
      return;
    }
    void armCycleEndNotification(timer.endsAt, {
      title: t(CYCLE_LABEL_KEY[timer.kind]),
      message: t('FocusCycleDone'),
    });
  }, [status, timer?.endsAt, timer?.kind, t]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
