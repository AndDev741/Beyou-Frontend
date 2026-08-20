import { getCalendars } from 'expo-localization';

/**
 * The device's IANA zone, or null when it cannot be read.
 *
 * The mobile half of the web `detectTimezone`: same contract, different primitive
 * (expo-localization rather than `Intl`). Shared between the signup payloads, the boot
 * reconcile and the settings suggestion so the three never disagree about what
 * "detected" means.
 */
export function detectTimezone(): string | null {
  try {
    return getCalendars()[0]?.timeZone ?? null;
  } catch {
    return null;
  }
}
