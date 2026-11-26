import type { Schemas } from '@beyou/contracts';
export type Profile = Schemas['UserResponseDTO'] & {
  /**
   * Set when the backend does not store the AI answer yet (its profile has no `aiConsent`):
   * the answer then lives on this device (`src/aiConsent/aiConsentStore.ts`) and the app
   * does all the gating itself. See `resolveAiConsent`.
   */
  aiConsentOnDevice?: boolean;
};
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
