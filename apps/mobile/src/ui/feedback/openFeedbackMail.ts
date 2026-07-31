import { Alert, Linking } from 'react-native';
import type { TFunction } from 'i18next';
import { FEEDBACK_EMAIL } from './feedbackConfig';

/**
 * Opens a pre-filled `mailto:` — and survives there being nothing to open it.
 *
 * `Linking.openURL` REJECTS when no app can handle the url, which for `mailto:`
 * is the norm on an emulator and common on a real Android device with no mail
 * client configured. Fired unawaited that produces two failures at once: the
 * button appears to do nothing, and the rejection goes unhandled. Both land on
 * the surfaces that exist precisely BECAUSE the normal path already failed — the
 * crash reporter and the feedback form's fallback — so "silently does nothing"
 * is the one outcome they cannot afford.
 *
 * The fallback is the address itself: shown in an alert, it still gets the
 * report to a human from whatever mail the user does have.
 */
export const openFeedbackMail = async (href: string, t: TFunction): Promise<void> => {
  try {
    await Linking.openURL(href);
  } catch {
    Alert.alert(t('FeedbackEmailLink'), t('FeedbackEmailUnavailable', { email: FEEDBACK_EMAIL }));
  }
};
