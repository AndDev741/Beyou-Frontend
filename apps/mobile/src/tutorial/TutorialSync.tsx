import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearPhase, setPhase } from './tutorialSlice';
import { loadTutorialPhase, saveTutorialPhase } from '../lib/tutorialStore';
import type { RootState, AppDispatch } from '../store';

/**
 * Boot gate for the tutorial. Hydrates the saved phase, and once the SIGNED-IN
 * user's hydrated profile confirms the tutorial was never completed, starts at
 * 'intro'. Persists every phase change so the walkthrough survives a restart.
 *
 * The gate deliberately waits for auth + profile:
 * - Firing before login used to re-seed 'intro' right after a logout (the
 *   store reset flips isTutorialCompleted true->false at the login screen),
 *   which replayed the tutorial for long-time users on their next login.
 * - Fresh installs never fired at all: isTutorialCompleted starts false and
 *   never *changes*, and the old hydration ref didn't re-run the effect.
 */
export default function TutorialSync() {
  const dispatch = useDispatch<AppDispatch>();
  const phase = useSelector((s: RootState) => s.tutorial.phase);
  const isCompleted = useSelector((s: RootState) => s.perfil.isTutorialCompleted);
  const authStatus = useSelector((s: RootState) => s.auth.status);
  // GET /user hydrated the shared perfil slice (email is never empty after).
  const profileLoaded = useSelector((s: RootState) => s.perfil.email !== '');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await loadTutorialPhase();
      if (saved) dispatch(setPhase(saved));
      setHydrated(true);
    })();
  }, [dispatch]);

  useEffect(() => {
    if (!hydrated || authStatus !== 'authenticated' || !profileLoaded) return;
    if (isCompleted === false && phase === null) {
      dispatch(setPhase('intro'));
    } else if (isCompleted === true && phase !== null) {
      // A stale persisted phase (e.g. 'intro' seeded by an old logout bug)
      // must never replay the tutorial for an account that completed it.
      dispatch(clearPhase());
    }
  }, [hydrated, authStatus, profileLoaded, isCompleted, phase, dispatch]);

  useEffect(() => {
    if (hydrated) saveTutorialPhase(phase);
  }, [hydrated, phase]);

  return null;
}
