import { forwardRef, useId, useLayoutEffect, useRef, useState, type ForwardedRef } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { getFriendlyErrorMessage, type ApiErrorPayload } from "@beyou/api/apiError";
import { QUICK_NOTE_TEXT_MAX } from "@beyou/types/quickNote/quickNote";
import { CHARS_LEFT_HINT_AT } from "./quickCapture";

type CaptureFieldProps = {
    id: string;
    /** Saves the idea. Answers true when it was saved, so the field can empty itself. */
    onSubmit: (text: string) => Promise<boolean>;
    /** Why the last save failed, shown under the field until the next keystroke. */
    error?: ApiErrorPayload | null;
    onDismissError?: () => void;
    autoFocus?: boolean;
    className?: string;
};

/** Grows with the text up to about five lines, then scrolls. */
const MAX_HEIGHT = 120;

/**
 * The one field that captures an idea, on the Ideas page and in the Alt+N dialog.
 *
 * Enter saves and Shift+Enter starts a new line, the way a chat box works, because capture has
 * to take seconds. A key pressed while an input method is still composing (a Japanese IME, a
 * dead key) belongs to the composition and never submits.
 */
function CaptureField(
    { id, onSubmit, error, onDismissError, autoFocus, className = "" }: CaptureFieldProps,
    ref: ForwardedRef<HTMLTextAreaElement>,
) {
    const { t } = useTranslation();
    const [text, setText] = useState("");
    const [busy, setBusy] = useState(false);
    const localRef = useRef<HTMLTextAreaElement | null>(null);
    const hintId = useId();
    const errorId = useId();
    const left = QUICK_NOTE_TEXT_MAX - text.length;
    const showLeft = left <= CHARS_LEFT_HINT_AT;

    useLayoutEffect(() => {
        const el = localRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
    }, [text]);

    const setRefs = (el: HTMLTextAreaElement | null) => {
        localRef.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
    };

    const submit = async () => {
        const value = text.trim();
        if (!value || busy) return;
        setBusy(true);
        const saved = await onSubmit(value);
        setBusy(false);
        // Only what was sent is cleared: anything typed while the save was in flight stays.
        if (saved) setText((current) => (current.trim() === value ? "" : current));
        localRef.current?.focus();
    };

    const describedBy = [showLeft ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

    return (
        <form
            className={className}
            onSubmit={(event) => {
                event.preventDefault();
                void submit();
            }}
        >
            <label htmlFor={id} className="sr-only">
                {t("IdeasCaptureLabel")}
            </label>
            <div
                className={`flex items-end gap-2 rounded-card border bg-surface py-1.5 pl-3.5 pr-1.5 transition-colors duration-200 focus-within:ring-2 focus-within:ring-accent/40 ${
                    error ? "border-danger/60" : "border-border"
                }`}
            >
                <textarea
                    id={id}
                    ref={setRefs}
                    rows={1}
                    value={text}
                    maxLength={QUICK_NOTE_TEXT_MAX}
                    autoFocus={autoFocus}
                    placeholder={t("IdeasCapturePlaceholder")}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    data-testid="ideas-capture-input"
                    onChange={(event) => {
                        setText(event.target.value);
                        if (error) onDismissError?.();
                    }}
                    onKeyDown={(event) => {
                        if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
                        event.preventDefault();
                        void submit();
                    }}
                    className="max-h-[120px] min-h-[36px] min-w-0 flex-1 resize-none bg-transparent py-2 text-[14px] leading-5 text-text placeholder:text-text-3 focus:outline-none"
                />
                {showLeft && (
                    <span
                        id={hintId}
                        aria-live="polite"
                        className={`shrink-0 pb-2.5 font-mono text-[11px] ${left <= 10 ? "text-danger" : "text-text-3"}`}
                        data-testid="ideas-capture-left"
                    >
                        {t("IdeasCharsLeft", { count: left })}
                    </span>
                )}
                <button
                    type="submit"
                    disabled={busy || !text.trim()}
                    data-testid="ideas-capture-submit"
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control bg-accent px-3.5 text-sm font-semibold text-on-accent transition-colors duration-200 hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Plus size={15} aria-hidden="true" />
                    {t("IdeasAdd")}
                </button>
            </div>
            {error && (
                <p id={errorId} role="alert" className="mt-1.5 text-[12.5px] text-danger" data-testid="ideas-capture-error">
                    {getFriendlyErrorMessage(t, error)}
                </p>
            )}
        </form>
    );
}

export default forwardRef(CaptureField);
