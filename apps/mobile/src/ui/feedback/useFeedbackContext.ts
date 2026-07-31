import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { buildFeedbackContext, type FeedbackContext } from '@beyou/api';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { APP_VERSION } from './feedbackConfig';

/**
 * R9 automatic capture, mobile side: the shared builder is deliberately
 * injection-only (it runs on web too, where `Platform` and expo-constants do
 * not exist), so the RN-specific sources are gathered here.
 *
 * `screen` is passed in rather than read from the router: a report opened from
 * the dashboard must say `/` even though the form itself lives at `/feedback`.
 */
export function useFeedbackContext(screen?: string | null): FeedbackContext | undefined {
  const { i18n } = useTranslation();
  const { theme } = useBeyouTheme();

  return useMemo(
    () =>
      buildFeedbackContext({
        screen,
        appVersion: APP_VERSION,
        platform: Platform.OS,
        language: i18n.language,
        theme: theme.mode,
      }),
    [screen, i18n.language, theme.mode],
  );
}
