import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "../Button";

type LineFormProps = {
    initial: string;
    label: string;
    /** The server's cap: 200 for a profile line, 500 for a note. */
    maxLength: number;
    /** Resolves true when the server kept it. On success the parent unmounts the form. */
    onSave: (text: string) => Promise<boolean>;
    onCancel: () => void;
    /** Rows the box opens with. A note is longer than a profile line. */
    rows?: number;
    formTestId: string;
    inputTestId: string;
};

/**
 * Writing one line in place: a profile line or a note about a thing. Enter saves, Shift+Enter
 * breaks the line, Escape gives up.
 */
export default function LineForm({
    initial,
    label,
    maxLength,
    onSave,
    onCancel,
    rows = 2,
    formTestId,
    inputTestId,
}: LineFormProps) {
    const { t } = useTranslation();
    const fieldId = useId();
    const [text, setText] = useState(initial);
    const [saving, setSaving] = useState(false);
    const trimmed = text.trim();

    const save = async () => {
        if (!trimmed || saving) return;
        setSaving(true);
        const ok = await onSave(trimmed);
        // On success the parent unmounts this form, so there is nothing left to reset.
        if (!ok) setSaving(false);
    };

    return (
        <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
                event.preventDefault();
                void save();
            }}
            data-testid={formTestId}
        >
            <label htmlFor={fieldId} className="text-[12.5px] font-semibold text-text-2">
                {label}
            </label>
            <textarea
                id={fieldId}
                rows={rows}
                autoFocus
                value={text}
                maxLength={maxLength}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === "Escape") onCancel();
                    if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void save();
                    }
                }}
                className="w-full resize-none rounded-control border border-border bg-bg px-3 py-2 text-sm leading-relaxed text-text transition-colors duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                data-testid={inputTestId}
            />
            <div className="flex items-center justify-between gap-3">
                <div className="flex gap-2">
                    <Button text={t("Save")} mode="primary" size="small" type="submit" disabled={!trimmed || saving} />
                    <Button text={t("Cancel")} mode="ghost" size="small" type="button" onClick={onCancel} />
                </div>
                <span className="font-mono text-[11px] text-text-3">
                    {text.length}/{maxLength}
                </span>
            </div>
        </form>
    );
}
