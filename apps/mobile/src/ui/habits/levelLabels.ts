/**
 * Importance/Difficulty 1–4 scale labels + colors, mirroring the web `useColors`
 * + `ChooseInput` levels. Values are 1-based (0 = unset). i18n keys are resolved
 * by the caller via `t()`.
 */
/**
 * A semantic scale in CLASSES, not raw colour: neutral → accent → attention →
 * risk. A fixed hex ignored both the theme and the accent pack (same call as the
 * web). Classes and not `var(--x)` because an RN inline style cannot resolve a CSS
 * var — only
 * o className passa pelo NativeWind.
 */
export const SCALE_CLASSES = ['bg-text-3', 'bg-accent', 'bg-flame', 'bg-danger'] as const;

export const IMPORTANCE_KEYS = ['Low', 'Medium', 'High', 'Max'] as const;
export const DIFFICULTY_KEYS = ['Easy', 'Normal', 'Hard', 'Terrible'] as const;

/** Colour class for a 1–4 value (transparent when out of range). */
export const scaleClass = (value: number): string => SCALE_CLASSES[value - 1] ?? 'bg-transparent';

/** i18n key for an importance/difficulty value (empty when unset). */
export const importanceKey = (value: number): string => IMPORTANCE_KEYS[value - 1] ?? '';
export const difficultyKey = (value: number): string => DIFFICULTY_KEYS[value - 1] ?? '';

/**
 * Chip variant for a 1–4 value: neutral → accent → attention → risk. Same scale
 * as the web's `attributeVariant` — the attribute became a label, so the colour
 * comes from the variant's token and not from a hand-painted circle.
 */
export const SCALE_VARIANTS = ['neutral', 'accent', 'flame', 'danger'] as const;

export const attributeVariant = (value: number): (typeof SCALE_VARIANTS)[number] =>
  SCALE_VARIANTS[value - 1] ?? 'neutral';
