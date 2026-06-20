import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useBeyouTheme } from './ThemeProvider';
import type { RootState } from '../store';

/**
 * Applies the user's saved theme (from the loaded profile) once it's available,
 * so a returning user sees their theme on launch instead of the default. Keyed
 * on the saved mode only — does NOT re-run on live in-app theme changes, so it
 * never fights a selection made in the Appearance settings this session.
 */
export default function ThemeSync() {
  const savedMode = useSelector(
    (s: RootState) => (s.auth.profile as { themeInUse?: string } | null)?.themeInUse,
  );
  const { setThemeByMode } = useBeyouTheme();

  useEffect(() => {
    if (savedMode) setThemeByMode(savedMode);
    // setThemeByMode is a stable setter; depending only on savedMode prevents
    // overriding a live theme pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedMode]);

  return null;
}
