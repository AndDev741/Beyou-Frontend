import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { setPhase } from '../tutorialSlice';
import { completeTutorial } from '../completeTutorial';
import { categoriesSteps } from '../steps/categoriesSteps';
import type { RootState, AppDispatch } from '../../store';

export function useCategoriesTutorial() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { t } = useTranslation();
  const phase = useSelector((s: RootState) => s.tutorial.phase);
  const hasCategories = useSelector((s: RootState) => s.categories.categories.length > 0);
  const active = phase === 'categories';
  const [stepIndex, setStepIndex] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (active) setStepIndex(hasCategories ? 1 : 0); }, [active]);

  const steps = categoriesSteps.map((s) =>
    s.id === 'create-category' ? { ...s, disabled: !hasCategories } : s,
  );

  const next = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      dispatch(setPhase('habits'));
      router.push('/habits');
    }
  };

  const prev = () => setStepIndex((i) => Math.max(0, i - 1));

  const skip = () => { completeTutorial({ dispatch, t }); };

  return { active, steps, stepIndex, next, prev, skip };
}
