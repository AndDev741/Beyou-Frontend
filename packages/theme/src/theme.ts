import type { ThemeBase, Tokens } from "./tokens";

/**
 * Um tema resolvido: a preferência do usuário (`mode`) já traduzida em tokens
 * concretos.
 *
 * Os campos do modelo antigo continuam aqui como ALIASES dos tokens novos. São
 * ~2.500 usos entre classes Tailwind e `theme.*` em JS; eles saem aos poucos,
 * componente a componente, e os campos desaparecem na fase de limpeza.
 */
export interface Theme extends Tokens {
  /** Preferência persistida: `"<system|light|dark>:<pack>"`. Ex.: `"system:beyou"`. */
  mode: string;
  /** Base efetivamente aplicada depois de resolver `system` contra o SO. */
  base: ThemeBase;
  /** Pack de acento em uso. */
  accentPack: string;

  /** @deprecated use `surface` (cartões) ou `bg` (fundo de página). */
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

/** Modo escolhido pelo usuário, antes de resolver `system` contra o SO. */
export type ThemeMode = "system" | ThemeBase;

export interface ThemePreference {
  mode: ThemeMode;
  accentPack: string;
}
