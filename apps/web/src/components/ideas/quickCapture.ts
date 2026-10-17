/**
 * Alt+N, the quick capture shortcut, and the rules around it.
 *
 * Matched on `code`, not `key`: on a Mac, Option+N is a dead key, so `key` is "Dead" (or "˜")
 * and a check on "n" never fires. `code` names the physical key whatever the layout makes of it.
 */
export function isQuickCaptureShortcut(event: KeyboardEvent): boolean {
    return (
        event.code === "KeyN" &&
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        !event.repeat
    );
}

/**
 * True when the key went to something the person is typing in.
 *
 * The shortcut stays out of text fields on purpose. On a Mac with a US layout, Option+N is how
 * you type the tilde in "não" and "ação", so taking it inside a field would break typing
 * Portuguese.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    const tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/** A dialog already on screen keeps the shortcut from stacking a second one on top. */
export function isModalOpen(): boolean {
    return document.querySelector('[role="dialog"][aria-modal="true"]') !== null;
}

/** Board moves skip their animation for people who asked the system for less motion. */
export function prefersReducedMotion(): boolean {
    try {
        return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    } catch {
        return false;
    }
}

/** The remaining-characters hint shows from this many left. */
export const CHARS_LEFT_HINT_AT = 50;
