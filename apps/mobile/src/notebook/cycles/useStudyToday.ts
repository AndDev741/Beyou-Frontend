import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { getStudyToday } from '@beyou/api/notebook';
import { enterStudyToday } from '@beyou/state';
import type { AppDispatch, RootState } from '../../store';

/**
 * Today's slice of the study cycles, read into the shared slice so the notebook card, the
 * dashboard widget and the cycle screen show the same day. `load` is the caller's to run: the
 * notebook home reads it each time it comes into view, the widget once when it mounts.
 *
 * A failed read keeps whatever the slice held and stays quiet: the card is one part of a screen
 * that reports its own errors, and a second toast for the same outage reads as noise.
 */
export function useStudyToday() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const today = useSelector((s: RootState) => s.studyCycles.today);
  const [loaded, setLoaded] = useState(today !== null);

  const load = useCallback(async () => {
    const response = await getStudyToday(t);
    if (response.success) dispatch(enterStudyToday(response.success));
    setLoaded(true);
  }, [dispatch, t]);

  return { today, loaded, load };
}
