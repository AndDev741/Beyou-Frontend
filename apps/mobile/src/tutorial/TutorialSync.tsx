import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPhase } from './tutorialSlice';
import { loadTutorialPhase, saveTutorialPhase } from '../lib/tutorialStore';
import type { RootState, AppDispatch } from '../store';

/**
 * Boot gate for the tutorial. Hydrates the saved phase, and for a user who has
 * not completed the tutorial and has no saved phase, starts at 'intro'. Persists
 * every phase change so the walkthrough survives an app restart mid-flow.
 */
export default function TutorialSync() {
  const dispatch = useDispatch<AppDispatch>();
  const phase = useSelector((s: RootState) => s.tutorial.phase);
  const isCompleted = useSelector((s: RootState) => s.perfil.isTutorialCompleted);
  const hydrated = useRef(false);

  useEffect(() => {
    (async () => {
      const saved = await loadTutorialPhase();
      if (saved) dispatch(setPhase(saved));
      hydrated.current = true;
    })();
  }, [dispatch]);

  // Once the profile says "not completed" and nothing is in flight, start the intro.
  useEffect(() => {
    if (!hydrated.current) return;
    if (isCompleted === false && phase === null) dispatch(setPhase('intro'));
  }, [isCompleted, phase, dispatch]);

  useEffect(() => {
    if (hydrated.current) saveTutorialPhase(phase);
  }, [phase]);

  return null;
}
