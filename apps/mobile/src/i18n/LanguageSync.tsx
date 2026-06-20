import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import type { RootState } from '../store';

/**
 * Applies the user's saved language (from the loaded profile) once it's
 * available, so a returning user sees the app in their language on launch
 * instead of the device default. Keyed on the saved value only — does NOT re-run
 * on a live in-app language pick, so it never fights a selection made in the
 * Preferences settings this session.
 */
export default function LanguageSync() {
  const savedLanguage = useSelector(
    (s: RootState) => (s.auth.profile as { languageInUse?: string } | null)?.languageInUse,
  );
  const { i18n } = useTranslation();

  useEffect(() => {
    if (savedLanguage) i18n.changeLanguage(savedLanguage);
    // i18n.changeLanguage is stable; depending only on savedLanguage prevents
    // overriding a live language pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedLanguage]);

  return null;
}
