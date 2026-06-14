import type { Schemas } from './index';
// If the backend removes/renames any of these, `typecheck` fails loudly.
type _AssertKnownSchemas =
  | Schemas['HabitResponseDTO']
  | Schemas['RefreshUiDTO']
  | Schemas['GoalResponseDTO']
  | Schemas['CategoryResponseDTO']
  | Schemas['TaskResponseDTO'];
export type {}; // keep this a module
// reference the type so noUnusedLocals (if on) doesn't complain:
export type __ContractsAssert = _AssertKnownSchemas;
