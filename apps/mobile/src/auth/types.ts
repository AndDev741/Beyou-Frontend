import type { Schemas } from '@beyou/contracts';
export type Profile = Schemas['UserResponseDTO'];
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
