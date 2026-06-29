import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { completeTutorial } from '../completeTutorial';
import type { RootState, AppDispatch } from '../../store';

export function useConfigTutorial() {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const phase = useSelector((s: RootState) => s.tutorial.phase);
  const finishing = useRef(false);

  useEffect(() => {
    if (phase !== 'config' || finishing.current) return;
    finishing.current = true;
    completeTutorial({ dispatch, t }).then((ok) => { if (!ok) finishing.current = false; });
  }, [phase, dispatch, t]);
}
