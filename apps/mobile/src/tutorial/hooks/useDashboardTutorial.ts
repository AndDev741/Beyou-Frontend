import { useEffect, useState } from 'react';
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

  useEffect(() => { if (active) setStepIndex(0); }, [active]);

  const next = () => {
    if (stepIndex < dashboardSteps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      dispatch(setPhase('categories'));
      router.push('/categories');
    }
  };
  const prev = () => setStepIndex((i) => Math.max(0, i - 1));
  const skip = () => { completeTutorial({ dispatch, t }); };

  return { active, steps: dashboardSteps, stepIndex, next, prev, skip };
}
