import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import setAiConsent from '@beyou/api/user/setAiConsent';
import type { AiConsent } from '@beyou/types/user/UserType';
import { aiConsentAnswered } from '../auth/authSlice';
import type { AppDispatch, RootState } from '../store';

/**
 * The signed-in account's answer about the AI provider, from the profile the session started
 * with. Undefined when the backend predates the field.
 */
export function useAiConsent(): AiConsent | null | undefined {
  return useSelector((s: RootState) => s.auth.profile?.aiConsent);
}

/**
 * Whether the AI features may run. Only a "no" turns them off: inside the app the answer is
 * never UNASKED (the root Gate asks first), and an older backend that does not know the
 * field leaves everything as it was.
 */
export function useAiAllowed(): boolean {
  return useAiConsent() !== 'DECLINED';
}

/**
 * Sends the person's yes or no and, once the server has it, puts it in the session. Returns
 * whether it was saved; on failure the caller says so and the old answer stays in force.
 */
export function useAnswerAiConsent() {
  const dispatch = useDispatch<AppDispatch>();
  const [saving, setSaving] = useState(false);

  const answer = useCallback(
    async (granted: boolean): Promise<boolean> => {
      setSaving(true);
      const res = await setAiConsent(granted);
      setSaving(false);
      if (res.error || !res.data) return false;
      dispatch(aiConsentAnswered(res.data.aiConsent ?? (granted ? 'GRANTED' : 'DECLINED')));
      return true;
    },
    [dispatch],
  );

  return { answer, saving };
}
