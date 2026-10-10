import type { Schemas } from './index';
// If the backend removes/renames any of these, `typecheck` fails loudly.
// The briefing, focus, mood and notebook DTOs are checked field by field against the
// hand-written client types in packages/api/src/contractChecks.ts, which can see both.
type _AssertKnownSchemas =
  | Schemas['HabitResponseDTO']
  | Schemas['RefreshUiDTO']
  | Schemas['GoalResponseDTO']
  | Schemas['CategoryResponseDTO']
  | Schemas['TaskResponseDTO'];
export type {}; // keep this a module
// reference the type so noUnusedLocals (if on) doesn't complain:
export type __ContractsAssert = _AssertKnownSchemas;
