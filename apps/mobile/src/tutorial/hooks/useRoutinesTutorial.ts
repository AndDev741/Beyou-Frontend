import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { setPhase } from '../tutorialSlice';
import { completeTutorial } from '../completeTutorial';
import { routinesSteps } from '../steps/routinesSteps';
import type { RootState, AppDispatch } from '../../store';

export function useRoutinesTutorial({ builderOpen, hasSection }: { builderOpen: boolean; hasSection: boolean }) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { t } = useTranslation();
  const phase = useSelector((s: RootState) => s.tutorial.phase);
  const hasRoutines = useSelector((s: RootState) => s.routines.routines.length > 0);
  const active = phase === 'routines';
  const [stepIndex, setStepIndex] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (active) setStepIndex(0); }, [active]);

  const steps = routinesSteps.map((s) => {
    if (s.id === 'section') return { ...s, disabled: !hasSection };
    if (s.id === 'save') return { ...s, disabled: !hasRoutines };
    return s;
  });

  const next = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      dispatch(setPhase('config'));
      router.push('/configuration');
    }
  };

  const prev = () => setStepIndex((i) => Math.max(0, i - 1));

  const skip = () => { completeTutorial({ dispatch, t }); };

  return { active, steps, stepIndex, next, prev, skip, builderOpen };
}
