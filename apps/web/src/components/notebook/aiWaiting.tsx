import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * What a notebook AI call shows while the person waits.
 *
 * A model call takes from a few seconds to over a minute, and a label alone ("Thinking…") looks
 * the same at second 3 and at second 70, when it might as well be frozen. So every wait shows
 * how long it has been, and past {@link AI_SLOW_AFTER_SECONDS} it says what is true: the
 * server asks the model once more on its own before giving up (NotebookLlm on the backend,
 * inside a 90 second budget).
 */
export const AI_SLOW_AFTER_SECONDS = 30;

/** Seconds since the component mounted. Mount it when the wait starts. */
export function useElapsedSeconds(): number {
    const [seconds, setSeconds] = useState(0);
    useEffect(() => {
        const started = Date.now();
        const id = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
        return () => window.clearInterval(id);
    }, []);
    return seconds;
}

export const formatElapsed = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * One line: the label, the elapsed time and, once the call runs long, the note that it is still
 * going. The timer is hidden from screen readers so it is not read out every second; the label
 * and the note are what a live region around this announces.
 */
export function AiWaitingLine({ label, slowNote = true, className = "" }: { label: string; slowNote?: boolean; className?: string }) {
    const { t } = useTranslation();
    const seconds = useElapsedSeconds();
    return (
        <span className={`inline-flex flex-col gap-0.5 ${className}`} data-testid="ai-waiting">
            <span>
                {label} <span aria-hidden="true" className="font-mono tabular-nums" data-testid="ai-waiting-elapsed">{formatElapsed(seconds)}</span>
            </span>
            {slowNote && seconds >= AI_SLOW_AFTER_SECONDS && (
                <span className="text-xs text-text-2" data-testid="ai-waiting-slow">{t("NotebookAiWaitSlow")}</span>
            )}
        </span>
    );
}
