/**
 * Importance/Difficulty 1–4 scale labels + colors, mirroring the web `useColors`
 * + `ChooseInput` levels. Values are 1-based (0 = unset). i18n keys are resolved
 * by the caller via `t()`.
 */
export const SCALE_COLORS = ['#8EB2C5', '#F9BF76', '#E5625C', '#D1313D'] as const;

export const IMPORTANCE_KEYS = ['Low', 'Medium', 'High', 'Max'] as const;
export const DIFFICULTY_KEYS = ['Easy', 'Normal', 'Hard', 'Terrible'] as const;

/** Color for a 1–4 value (transparent when unset/out of range). */
export const scaleColor = (value: number): string => SCALE_COLORS[value - 1] ?? 'transparent';

/** i18n key for an importance/difficulty value (empty when unset). */
export const importanceKey = (value: number): string => IMPORTANCE_KEYS[value - 1] ?? '';
export const difficultyKey = (value: number): string => DIFFICULTY_KEYS[value - 1] ?? '';
