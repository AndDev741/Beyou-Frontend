/**
 * Importance/Difficulty 1–4 scale labels + colors, mirroring the web `useColors`
 * + `ChooseInput` levels. Values are 1-based (0 = unset). i18n keys are resolved
 * by the caller via `t()`.
 */
/**
 * Escala semântica em CLASSE, não em cor crua: neutro → acento → atenção →
 * risco. Hex fixo ignorava o tema e o pack de acento (mesma decisão do web).
 * Classe e não `var(--x)` porque style inline do RN não resolve CSS var — só
 * o className passa pelo NativeWind.
 */
export const SCALE_CLASSES = ['bg-text-3', 'bg-accent', 'bg-flame', 'bg-danger'] as const;

export const IMPORTANCE_KEYS = ['Low', 'Medium', 'High', 'Max'] as const;
export const DIFFICULTY_KEYS = ['Easy', 'Normal', 'Hard', 'Terrible'] as const;

/** Classe de cor para um valor 1–4 (transparente quando fora da faixa). */
export const scaleClass = (value: number): string => SCALE_CLASSES[value - 1] ?? 'bg-transparent';

/** i18n key for an importance/difficulty value (empty when unset). */
export const importanceKey = (value: number): string => IMPORTANCE_KEYS[value - 1] ?? '';
export const difficultyKey = (value: number): string => DIFFICULTY_KEYS[value - 1] ?? '';
