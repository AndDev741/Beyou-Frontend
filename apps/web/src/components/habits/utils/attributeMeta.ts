import { TFunction } from "i18next";
import type { ChipVariant } from "../../../ui/Chip";

/**
 * Importance and difficulty share the same 1..4 scale.
 *
 * Replaces the old `useColors`, which existed only to push a raw colour into a
 * circle's `style={{backgroundColor}}`. In the new system the attribute is a
 * `Chip`, so the colour comes from the variant's token and what is left here is the
 * pair (phrase, variant) — pure, with no state and no effect.
 */
export type AttributeKind = "difficulty" | "importance";

const PHRASE_KEYS: Record<AttributeKind, readonly string[]> = {
    difficulty: ["Easy", "Normal", "Hard", "Terrible"],
    importance: ["Low", "Medium", "High", "Max"],
};

/** Neutral → accent → attention → risk: the same semantic scale as before. */
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
