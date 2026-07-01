import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { setPhase } from '../tutorialSlice';
import { completeTutorial } from '../completeTutorial';
import { configSteps } from '../steps/configSteps';
import type { RootState, AppDispatch } from '../../store';

/**
 * Config walkthrough: one spotlight step per settings section. Finishing moves to
 * the 'done' phase and returns to the dashboard, where the finale message shows.
 */
export function useConfigTutorial() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { t } = useTranslation();
  const phase = useSelector((s: RootState) => s.tutorial.phase);
  const active = phase === 'config';
  const [stepIndex, setStepIndex] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (active) setStepIndex(0); }, [active]);

  const steps = configSteps;

  const next = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      dispatch(setPhase('done'));
      router.replace('/');
    }
  };

  const prev = () => setStepIndex((i) => Math.max(0, i - 1));

  const skip = () => { completeTutorial({ dispatch, t }); };

  return { active, steps, stepIndex, next, prev, skip };
}
