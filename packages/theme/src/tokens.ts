/**
 * Design tokens do redesign 2026.
 *
 * Duas bases (clara/escura) desenhadas com capricho + packs de acento que
 * trocam SÓ a cor de marca, mantendo superfícies e neutros. Componentes nunca
 * leem cor concreta: leem token. Valores vindos da seção Tokens do mockup.
 */

export type ThemeBase = "light" | "dark";

/** Superfícies e neutros — o que o pack de acento NÃO mexe. */
export interface NeutralTokens {
    bg: string;
    surface: string;
    surface2: string;
    border: string;
    text: string;
    text2: string;
    text3: string;
    xp: string;
    xpSoft: string;
    flame: string;
    flameSoft: string;
    success: string;
    danger: string;
    shadow: string;
}

/** As quatro linhas que um pack de acento redefine. */
export interface AccentTokens {
    accent: string;
    accentStrong: string;
    onAccent: string;
    accentSoft: string;
}

export type Tokens = NeutralTokens & AccentTokens;

/** #RRGGBB + alpha → rgba(). Aceita 8 dígitos e descarta o alpha existente. */
export const withAlpha = (hex: string, alpha: number): string => {
    const clean = hex.replace("#", "").slice(0, 6);
    const int = parseInt(clean, 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    return `rgba(${r},${g},${b},${alpha})`;
};

export const neutrals: Record<ThemeBase, NeutralTokens> = {
    light: {
        bg: "#F5F7FA",
        surface: "#FFFFFF",
        surface2: "#EDF0F4",
        border: "#E2E6EC",
        text: "#171B22",
        text2: "#566070",
        text3: "#8792A2",
        xp: "#B45309",
        xpSoft: "rgba(217,119,6,.13)",
        flame: "#EA580C",
        flameSoft: "rgba(234,88,12,.12)",
        success: "#0E9F6E",
        danger: "#DC2626",
        shadow: "0 1px 2px rgba(23,27,34,.05), 0 8px 24px rgba(23,27,34,.06)",
    },
    dark: {
        bg: "#0E1218",
        surface: "#151A22",
        surface2: "#1D242E",
        border: "#29313D",
        text: "#F0F4F9",
        text2: "#A3AEBD",
        text3: "#6C7889",
        xp: "#FBBF24",
        xpSoft: "rgba(251,191,36,.14)",
        flame: "#FB923C",
        flameSoft: "rgba(251,146,60,.14)",
        success: "#34D399",
        danger: "#F87171",
        shadow: "0 1px 2px rgba(0,0,0,.4), 0 12px 32px rgba(0,0,0,.35)",
    },
};

/** Texto/ícone SOBRE o acento. Claro usa branco; escuro usa um azul quase preto. */
const ON_ACCENT: Record<ThemeBase, string> = { light: "#FFFFFF", dark: "#0B1526" };

/** Opacidade do accent-soft por base (fundo de seleção e tiles). */
const SOFT_ALPHA: Record<ThemeBase, number> = { light: 0.09, dark: 0.13 };

export interface AccentPack {
    /** id persistido (parte do themeInUse). */
    id: string;
    /** chave de i18n do nome exibido. */
    labelKey: string;
    accent: Record<ThemeBase, string>;
    /** hover/pressed do acento. */
    accentStrong: Record<ThemeBase, string>;
}

export const accentPacks: AccentPack[] = [
    {
        id: "beyou",
        labelKey: "AccentBeyou",
        accent: { light: "#1D6BF3", dark: "#5C9DFF" },
        accentStrong: { light: "#1558D6", dark: "#7AB0FF" },
    },
    {
        id: "amethyst",
        labelKey: "AccentAmethyst",
        accent: { light: "#8B5CF6", dark: "#A78BFA" },
        accentStrong: { light: "#7C3AED", dark: "#C4B5FD" },
    },
    {
        id: "sunset",
        labelKey: "AccentSunset",
        accent: { light: "#E45A0B", dark: "#FB923C" },
        accentStrong: { light: "#C2410C", dark: "#FDBA74" },
    },
    {
        id: "forest",
        labelKey: "AccentForest",
        accent: { light: "#0E9F6E", dark: "#34D399" },
        accentStrong: { light: "#0B7F58", dark: "#6EE7B7" },
    },
    {
        id: "cyber",
        labelKey: "AccentCyber",
        accent: { light: "#D9469B", dark: "#F472B6" },
        accentStrong: { light: "#B0357B", dark: "#F9A8D4" },
    },
];

export const DEFAULT_ACCENT_PACK = "beyou";

export const findAccentPack = (id: string | undefined | null): AccentPack =>
    accentPacks.find((pack) => pack.id === id) ??
    accentPacks.find((pack) => pack.id === DEFAULT_ACCENT_PACK)!;

/** Compõe os 18 tokens concretos de uma base + um pack. */
export function buildTokens(base: ThemeBase, packId: string): Tokens {
    const pack = findAccentPack(packId);
    return {
        ...neutrals[base],
        accent: pack.accent[base],
        accentStrong: pack.accentStrong[base],
        onAccent: ON_ACCENT[base],
        accentSoft: withAlpha(pack.accent[base], SOFT_ALPHA[base]),
    };
}

/** Uma família de raio por camada — frame, cartão, controle, pill. */
export const radii = {
    frame: "24px",
    card: "16px",
    control: "10px",
    pill: "999px",
} as const;

export const fontStacks = {
    sans: "'Geist', system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "'Geist Mono', ui-monospace, 'SF Mono', monospace",
} as const;
