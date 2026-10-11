import { useCallback, useRef, useState } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { toggleCalendarTask } from '@beyou/api/calendar/calendarApi';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { applyRefreshUi } from '@beyou/state/user/refreshUiThunk';
import type { CalendarTask } from '@beyou/types/calendar/calendar';
import { notify } from '../notify';
import type { AppDispatch, RootState } from '../store';
import { isCalendarTaskGone } from './calendarDay';

interface UseCalendarTaskToggleOptions {
  /**
   * The task no longer exists on the server (deleted on another device). The caller drops it
   * from what it shows; a short toast has already said why.
   */
  onGone?: (id: string) => void;
}

/**
 * Completes or un-completes a calendar task, and moves the XP everywhere.
 *
 * The server answers with the task and a `RefreshUiDTO`; the latter goes through the same
 * `applyRefreshUi` the goal completion and the routine check use, so the profile's XP, level and
 * any level-up celebration follow without a refetch. The previous level is read from the store
 * BEFORE applying, which is what the celebration diff needs.
 *
 * Resolves to the task as it now is, or null when the call failed (a toast has been shown).
 */
export default function useCalendarTaskToggle({ onGone }: UseCalendarTaskToggleOptions = {}) {
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const { t } = useTranslation();
  const [pendingId, setPendingId] = useState<string | null>(null);
  // A ref as well as state: two taps inside one render would both read the old state.
  const inFlight = useRef<Set<string>>(new Set());

  const toggle = useCallback(
    async (task: CalendarTask): Promise<CalendarTask | null> => {
      if (inFlight.current.has(task.id)) return null;
      inFlight.current.add(task.id);
      setPendingId(task.id);
      try {
        const response = await toggleCalendarTask(task.id, t);
        if (isCalendarTaskGone(response.error)) {
          notify.info(t('CALENDAR_TASK_NOT_FOUND'));
          onGone?.(task.id);
          return null;
        }
        if (response.error || !response.success) {
          notify.error(getFriendlyErrorMessage(t, response.error));
          return null;
        }
        const previous = store.getState().perfil;
        applyRefreshUi(response.success.refreshUi, dispatch, {
          level: previous.level,
          constance: previous.constance,
        });
        return response.success.task;
      } finally {
        inFlight.current.delete(task.id);
        setPendingId((current) => (current === task.id ? null : current));
      }
    },
    [dispatch, store, t, onGone],
  );

  return { toggle, pendingId };
}
