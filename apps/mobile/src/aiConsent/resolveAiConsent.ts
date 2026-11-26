import setAiConsent from '@beyou/api/user/setAiConsent';
import type { Profile } from '../auth/types';
import { loadDeviceAiConsent, saveDeviceAiConsent } from './aiConsentStore';

/**
 * Settles the AI answer for a profile that just arrived (sign-in or app start).
 *
 * - The server keeps the answer: it wins, and the device keeps a copy.
 * - The server says UNASKED but this device holds an answer the person gave while the server
 *   could not store it: hand it over, so they are not asked twice.
 * - The server does not know the field (a backend from before it): the device's answer, or
 *   UNASKED, flagged `aiConsentOnDevice` so the app keeps it here and does the gating itself.
 */
export async function resolveAiConsent(profile: Profile): Promise<Profile> {
  const onDevice = await loadDeviceAiConsent(profile.id);

  if (!profile.aiConsent) {
    return { ...profile, aiConsent: onDevice ?? 'UNASKED', aiConsentOnDevice: true };
  }
  if (profile.aiConsent === 'UNASKED' && onDevice) {
    // Lands only if nobody answered on another device meanwhile; the reply says what holds.
    const res = await setAiConsent(onDevice === 'GRANTED', { onlyIfUnasked: true });
    const holds = res.data?.aiConsent;
    if (holds && holds !== 'UNASKED') {
      if (holds !== onDevice) await saveDeviceAiConsent(profile.id, holds);
      return { ...profile, aiConsent: holds };
    }
    // Not handed over (offline, say). A "no" kept on this device still holds here, and the
    // next start tries again; a "yes" is asked again rather than assumed.
    return { ...profile, aiConsent: onDevice === 'DECLINED' ? 'DECLINED' : 'UNASKED' };
  }
  if (profile.aiConsent !== 'UNASKED' && profile.aiConsent !== onDevice) {
    await saveDeviceAiConsent(profile.id, profile.aiConsent);
  }
  return profile;
}
