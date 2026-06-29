import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { setPhase } from '../tutorialSlice';
import { completeTutorial } from '../completeTutorial';
import { dashboardSteps } from '../steps/dashboardSteps';
import type { RootState, AppDispatch } from '../../store';

export function useDashboardTutorial() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { t } = useTranslation();
  const phase = useSelector((s: RootState) => s.tutorial.phase);
  const active = phase === 'dashboard';
  const [stepIndex, setStepIndex] = useState(0);
  // Use a ref to avoid dispatching inside a setState updater (React 19 warning).
  const shouldAdvancePhaseRef = useRef(false);

  useEffect(() => { if (active) setStepIndex(0); }, [active]);

  // Advance phase to categories when the last step has been passed.
  useEffect(() => {
    if (shouldAdvancePhaseRef.current) {
      shouldAdvancePhaseRef.current = false;
      dispatch(setPhase('categories'));
      router.push('/categories');
    }
  });

  const next = () => {
    setStepIndex((i) => {
      if (i < dashboardSteps.length - 1) return i + 1;
      shouldAdvancePhaseRef.current = true;
      return i;
    });
  };
  const prev = () => setStepIndex((i) => Math.max(0, i - 1));
  const skip = () => { completeTutorial({ dispatch, t }); };

  return { active, steps: dashboardSteps, stepIndex, next, prev, skip };
}
