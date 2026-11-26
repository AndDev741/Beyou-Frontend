import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import setAiConsent from '@beyou/api/user/setAiConsent';
import type { AiConsent } from '@beyou/types/user/UserType';
import { aiConsentAnswered } from '../auth/authSlice';
import { saveDeviceAiConsent } from './aiConsentStore';
import type { AppDispatch, RootState } from '../store';

/**
 * The signed-in account's answer about the AI provider, from the profile the session started
 * with. Undefined when the backend predates the field.
 */
export function useAiConsent(): AiConsent | null | undefined {
  return useSelector((s: RootState) => s.auth.profile?.aiConsent);
}

/**
 * Whether the AI features may run: only after a yes. No answer in the session at all (no
 * profile yet) changes nothing, since nothing can reach the provider without a session.
 */
export function useAiAllowed(): boolean {
  const consent = useAiConsent();
  return consent == null || consent === 'GRANTED';
}

/**
 * True when the server cannot keep a "no" itself (it predates the field), so the app must not
 * even ask for things the server would hand to the provider, such as the daily briefing.
 */
export function useAiDeclinedOnDeviceOnly(): boolean {
  return useSelector(
    (s: RootState) => Boolean(s.auth.profile?.aiConsentOnDevice) && s.auth.profile?.aiConsent === 'DECLINED',
  );
}

/**
 * Sends the person's yes or no and, once the server has it, puts it in the session. Returns
 * whether it was saved; on failure the caller says so and the old answer stays in force.
 */
export function useAnswerAiConsent() {
  const dispatch = useDispatch<AppDispatch>();
  const profile = useSelector((s: RootState) => s.auth.profile);
  const userId = profile?.id;
  const onDevice = Boolean(profile?.aiConsentOnDevice);
  const [saving, setSaving] = useState(false);

  const answer = useCallback(
    async (granted: boolean): Promise<boolean> => {
      const consent: AiConsent = granted ? 'GRANTED' : 'DECLINED';
      setSaving(true);
      // A backend that cannot store it yet: the device keeps it and hands it over later
      // (resolveAiConsent). Otherwise the server's word comes first.
      if (!onDevice) {
        const res = await setAiConsent(granted);
        // A "yes" needs the server. A "no" does not: it holds on this device at once (the
        // HTTP client refuses the AI routes), and the next start hands it over.
        if ((res.error || !res.data) && granted) {
          setSaving(false);
          return false;
        }
      }
      await saveDeviceAiConsent(userId, consent);
      setSaving(false);
      dispatch(aiConsentAnswered(consent));
      return true;
    },
    [dispatch, onDevice, userId],
  );

  return { answer, saving };
}
