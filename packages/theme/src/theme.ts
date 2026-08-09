import type { ThemeBase, Tokens } from "./tokens";

/**
 * A resolved theme: the user's preference (`mode`) already turned into concrete
 * tokens.
 *
 * The old-model fields stay here as ALIASES of the new tokens. There are ~2,500
 * uses across Tailwind classes and `theme.*` in JS; they go component by
 * component, and the fields disappear in the cleanup phase.
 */
export interface Theme extends Tokens {
  /** Persisted preference: `"<system|light|dark>:<pack>"`, e.g. `"system:beyou"`. */
  mode: string;
  /** The base actually applied, after resolving `system` against the OS. */
  base: ThemeBase;
  /** Accent pack in use. */
  accentPack: string;

  /** @deprecated use `surface` (cards) or `bg` (page background). */
  background: string;
  /** @deprecated use `accent`. */
  primary: string;
  /** @deprecated use `text`. */
  secondary: string;
  /** @deprecated use `text2`. */
  description: string;
  /** @deprecated use `text2`. */
  icon: string;
  /** @deprecated use `text3`. */
  placeholder: string;
  /** @deprecated use `danger`. */
  error: string;
}

/** Mode chosen by the user, before resolving `system` against the OS. */
export type ThemeMode = "system" | ThemeBase;

export interface ThemePreference {
  mode: ThemeMode;
  accentPack: string;
}
