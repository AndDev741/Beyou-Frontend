import { useEffect, useLayoutEffect } from 'react';
import { useSelector } from 'react-redux';
import { serializeThemePreference } from '@beyou/theme';
import { useBeyouTheme } from './ThemeProvider';
import { saveTheme } from '../lib/themeStore';
import type { RootState } from '../store';

/**
 * Applies the user's saved theme (from the loaded profile) once it's available,
 * so a returning user sees their theme on launch instead of the default. Keyed
 * on the saved mode only — does NOT re-run on live in-app theme changes, so it
 * never fights a selection made in the Appearance settings this session.
 *
 * Also remembers, on the device, whatever theme is showing. The root layout opens
 * the next cold start in it (see loadSavedTheme), which is what keeps a launch
 * from painting the default first and the account's theme a network round-trip
 * later. One place, so a live pick in Appearance and the profile's value both
 * land in the cache without either caller having to remember to write it.
 */
export default function ThemeSync() {
  const savedMode = useSelector(
    (s: RootState) => (s.auth.profile as { themeInUse?: string } | null)?.themeInUse,
  );
  const { preference, setThemeByMode } = useBeyouTheme();

  // Layout, not a plain effect: applied before the frame paints, so the profile
  // arriving is not one frame of the old theme followed by the new one.
  useLayoutEffect(() => {
    if (savedMode) setThemeByMode(savedMode);
    // setThemeByMode is a stable setter; depending only on savedMode prevents
    // overriding a live theme pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedMode]);

  useEffect(() => {
    void saveTheme(serializeThemePreference(preference));
  }, [preference]);

  return null;
}
