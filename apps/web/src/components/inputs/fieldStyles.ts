/**
 * The system's field grammar, in one place: label on top, accent border plus a
 * soft halo on focus, danger border with the message below on error.
 *
 * Every input used to carry its own copy of `borderCss/labelCss/errorCss` — and
 * they had already drifted (a `text-2xl` label in one, `text-xl` in another, a
 * 50px height fighting 40px on the same element).
 *
 * Note: an opacity modifier (`ring-accent/25`) does NOT emit CSS here — the tokens
 * are `var(--x)` without `<alpha-value>`, so the halo uses the `accent-soft`
 * token, which already is the translucent accent.
 */

/** Width inherited from the current form layout. Change here, every form follows. */
export const FIELD_WIDTH = "w-[45vw] md:w-[320px] lg:w-[15rem]";

export const FIELD_LABEL = "mb-1 text-sm font-semibold text-text";

export const FIELD_ERROR = "mt-1 break-words whitespace-normal text-sm leading-snug text-danger";

const FIELD_BASE =
    "rounded-control border bg-surface text-base text-text placeholder:text-text-3 outline-none transition-colors duration-200 focus:ring-4 focus:ring-accent-soft";

/** Border: accent on focus, danger when there is an error. */
export function fieldControl(hasError: boolean): string {
    return `${FIELD_BASE} ${hasError ? "border-danger" : "border-border focus:border-accent"}`;
}
