import { useCallback, useEffect, useRef, useState } from 'react';
import { RESEND_VERIFICATION_COOLDOWN_SECONDS } from '@beyou/api';
import { resendVerificationRequest } from './authApi';

export type ResendStatus = 'idle' | 'sending' | 'sent' | 'error';

/**
 * The "send it again" action behind the unverified-email notice.
 *
 * <p>The countdown is cosmetic. The backend holds the real cooldown and answers the
 * same 200 whether it mailed anything or not, so the only honest thing the button can
 * do is stop asking for a minute and say the mail is on its way.
 *
 * <p>Twin of the web hook at {@code apps/web/src/services/authentication/useResendVerification.ts}.
 * Both import the same cooldown constant from {@code @beyou/api}, which is what keeps
 * them from drifting; they stay separate because a shared hook would mean importing
 * React across the package boundary and this app's dual-React setup does not survive
 * that (see apps/mobile/AGENTS.md).
 */
export default function useResendVerification(email: string) {
  const [status, setStatus] = useState<ResendStatus>('idle');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => stopTimer, [stopTimer]);

  const resend = useCallback(async () => {
    if (status === 'sending' || secondsLeft > 0 || !email) return;

    setStatus('sending');
    const ok = await resendVerificationRequest(email);

    if (!ok) {
      setStatus('error');
      return;
    }

    setStatus('sent');
    setSecondsLeft(RESEND_VERIFICATION_COOLDOWN_SECONDS);
    stopTimer();
    timer.current = setInterval(() => {
      setSecondsLeft(previous => {
        if (previous <= 1) {
          stopTimer();
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
  }, [email, secondsLeft, status, stopTimer]);

  return { status, secondsLeft, resend, disabled: status === 'sending' || secondsLeft > 0 };
}
