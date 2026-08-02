import { TFunction } from "i18next";
import type { ChipVariant } from "../../../ui/Chip";

/**
 * Importância e dificuldade compartilham a mesma escala 1..4.
 *
 * Substitui o antigo `useColors`, que existia só para empurrar uma cor crua
 * para dentro de um `style={{backgroundColor}}` de um círculo. No sistema novo
 * o atributo é um `Chip`, então a cor vem do token da variante e o que sobra
 * aqui é o par (frase, variante) — puro, sem estado nem efeito.
 */
export type AttributeKind = "difficulty" | "importance";

const PHRASE_KEYS: Record<AttributeKind, readonly string[]> = {
    difficulty: ["Easy", "Normal", "Hard", "Terrible"],
    importance: ["Low", "Medium", "High", "Max"],
};

/** Neutro → acento → atenção → risco: a mesma escala semântica de antes. */
const VARIANTS: readonly ChipVariant[] = ["neutral", "accent", "flame", "danger"];

function indexOf(level: number | undefined): number | null {
    if (!level || level < 1 || level > VARIANTS.length) return null;
    return level - 1;
}

export function attributePhrase(kind: AttributeKind, level: number | undefined, t: TFunction): string {
    const index = indexOf(level);
    return index === null ? "" : t(PHRASE_KEYS[kind][index]);
}

export function attributeVariant(level: number | undefined): ChipVariant {
    const index = indexOf(level);
    return index === null ? "neutral" : VARIANTS[index];
}
