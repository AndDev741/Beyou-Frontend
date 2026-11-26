import * as SecureStore from 'expo-secure-store';
import type { AiConsent } from '@beyou/types/user/UserType';

/**
 * The answer kept on this device, for a backend that does not store it yet (its profile has
 * no `aiConsent`). Per account, so a second account on the phone is asked on its own.
 */
const key = (userId?: string) => `beyou.aiConsent.${userId ?? 'account'}`;

export async function loadDeviceAiConsent(userId?: string): Promise<AiConsent | null> {
  try {
    const raw = await SecureStore.getItemAsync(key(userId));
    return raw === 'GRANTED' || raw === 'DECLINED' ? raw : null;
  } catch {
    return null;
  }
}

export async function saveDeviceAiConsent(userId: string | undefined, consent: AiConsent): Promise<void> {
  try {
    await SecureStore.setItemAsync(key(userId), consent);
  } catch {
    // best-effort: a lost write means the question is asked again, never that data is sent
  }
}
