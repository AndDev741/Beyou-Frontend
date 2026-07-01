import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { setPhase } from '../tutorialSlice';
import { completeTutorial } from '../completeTutorial';
import { habitsSteps } from '../steps/habitsSteps';
import type { RootState, AppDispatch } from '../../store';

export function useHabitsTutorial() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { t } = useTranslation();
  const phase = useSelector((s: RootState) => s.tutorial.phase);
  const hasHabits = useSelector((s: RootState) => s.habits.habits.length > 0);
  const active = phase === 'habits';
  const [stepIndex, setStepIndex] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (active) setStepIndex(hasHabits ? 1 : 0); }, [active]);

  const steps = habitsSteps.map((s) =>
    s.id === 'create-habit' ? { ...s, disabled: !hasHabits } : s,
  );

  const next = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      dispatch(setPhase('routines'));
      router.push('/routines');
    }
  };

  const prev = () => setStepIndex((i) => Math.max(0, i - 1));

  const skip = () => { completeTutorial({ dispatch, t }); };

  return { active, steps, stepIndex, next, prev, skip };
}
