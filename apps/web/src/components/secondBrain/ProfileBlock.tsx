import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { SECOND_BRAIN_FACT_TITLE } from "@beyou/state";
import {
    SECOND_BRAIN_FACT_KINDS,
    SECOND_BRAIN_FACT_LIMIT,
    SECOND_BRAIN_FACT_TEXT_MAX,
    type SecondBrainFact,
    type SecondBrainFactInput,
    type SecondBrainFactKind,
} from "@beyou/types/secondBrain/secondBrain";
import Button from "../Button";
import IconButton from "../../ui/IconButton";
import Block from "./Block";

type ProfileBlockProps = {
    facts: SecondBrainFact[];
    /** Each resolves true when the server kept the change. On false the caller has toasted. */
    onCreate: (input: SecondBrainFactInput) => Promise<boolean>;
    onEdit: (id: string, input: SecondBrainFactInput) => Promise<boolean>;
    onDelete: (id: string) => Promise<boolean>;
};

/** Which line is being written: a new one under a heading, or an existing one. */
type Editing = { mode: "new"; kind: SecondBrainFactKind } | { mode: "edit"; fact: SecondBrainFact };

function LineForm({
    initial,
    label,
    onSave,
    onCancel,
}: {
    initial: string;
    label: string;
    onSave: (text: string) => Promise<boolean>;
    onCancel: () => void;
}) {
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
            data-testid="second-brain-fact-form"
        >
            <label htmlFor={fieldId} className="text-[12.5px] font-semibold text-text-2">
                {label}
            </label>
            <textarea
                id={fieldId}
                rows={2}
                autoFocus
                value={text}
                maxLength={SECOND_BRAIN_FACT_TEXT_MAX}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === "Escape") onCancel();
                    if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void save();
                    }
                }}
                className="w-full resize-none rounded-control border border-border bg-bg px-3 py-2 text-sm leading-relaxed text-text transition-colors duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                data-testid="second-brain-fact-input"
            />
            <div className="flex items-center justify-between gap-3">
                <div className="flex gap-2">
                    <Button text={t("Save")} mode="primary" size="small" type="submit" disabled={!trimmed || saving} />
                    <Button text={t("Cancel")} mode="ghost" size="small" type="button" onClick={onCancel} />
                </div>
                <span className="font-mono text-[11px] text-text-3">
                    {text.length}/{SECOND_BRAIN_FACT_TEXT_MAX}
                </span>
            </div>
        </form>
    );
}

/**
 * The general layer: the few lines every conversation starts from.
 *
 * It is short by design. These lines go out with every chat, so each one costs something on
 * every message, and a profile that tries to hold everything stops being read. The server caps
 * it; the count in the corner shows how much room is left.
 */
export default function ProfileBlock({ facts, onCreate, onEdit, onDelete }: ProfileBlockProps) {
    const { t } = useTranslation();
    const [editing, setEditing] = useState<Editing | null>(null);
    const [removing, setRemoving] = useState<string | null>(null);
    const full = facts.length >= SECOND_BRAIN_FACT_LIMIT;

    const remove = async (id: string) => {
        setRemoving(id);
        await onDelete(id);
        setRemoving(null);
    };

    return (
        <Block
            title={t("SecondBrainProfileTitle")}
            hint={t("SecondBrainProfileHint")}
            testId="second-brain-profile"
            action={
                <span className="font-mono text-xs text-text-2" data-testid="second-brain-fact-count">
                    {facts.length}/{SECOND_BRAIN_FACT_LIMIT}
                </span>
            }
        >
            <div className="flex flex-col gap-6">
                {SECOND_BRAIN_FACT_KINDS.map((kind) => {
                    const lines = facts.filter((fact) => fact.kind === kind);
                    const adding = editing?.mode === "new" && editing.kind === kind;
                    return (
                        <div key={kind} data-testid={`second-brain-facts-${kind}`}>
                            <h3 className="text-[13px] font-semibold text-text-2">{t(SECOND_BRAIN_FACT_TITLE[kind])}</h3>

                            {lines.length === 0 && !adding && (
                                <p className="mt-2 text-[13px] text-text-3">{t("SecondBrainFactEmpty")}</p>
                            )}

                            {lines.length > 0 && (
                                <ul className="mt-2 flex flex-col gap-1">
                                    {lines.map((fact) =>
                                        editing?.mode === "edit" && editing.fact.id === fact.id ? (
                                            <li key={fact.id} className="py-1">
                                                <LineForm
                                                    initial={fact.text}
                                                    label={t("SecondBrainFactEditLabel")}
                                                    onCancel={() => setEditing(null)}
                                                    onSave={async (text) => {
                                                        const ok = await onEdit(fact.id, { kind: fact.kind, text });
                                                        if (ok) setEditing(null);
                                                        return ok;
                                                    }}
                                                />
                                            </li>
                                        ) : (
                                            <li
                                                key={fact.id}
                                                className="group -mx-2 flex items-start gap-2 rounded-control px-2 py-1.5 transition-colors duration-200 hover:bg-surface-2/60 focus-within:bg-surface-2/60"
                                                data-testid="second-brain-fact"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="break-words text-sm leading-snug text-text">{fact.text}</p>
                                                    {fact.origin === "ANSWER" && (
                                                        <p className="mt-0.5 text-[11.5px] text-text-3">
                                                            {t("SecondBrainFactFromAnswer")}
                                                        </p>
                                                    )}
                                                </div>
                                                {/* Always there on touch screens, where nothing hovers. */}
                                                <div className="flex shrink-0 gap-0.5 transition-opacity duration-200 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                                                    <IconButton
                                                        label={t("Edit")}
                                                        className="h-7 w-7"
                                                        onClick={() => setEditing({ mode: "edit", fact })}
                                                    >
                                                        <Pencil size={14} aria-hidden="true" />
                                                    </IconButton>
                                                    <IconButton
                                                        label={t("Delete")}
                                                        tone="danger"
                                                        className="h-7 w-7"
                                                        disabled={removing === fact.id}
                                                        onClick={() => void remove(fact.id)}
                                                    >
                                                        <Trash2 size={14} aria-hidden="true" />
                                                    </IconButton>
                                                </div>
                                            </li>
                                        ),
                                    )}
                                </ul>
                            )}

                            {adding ? (
                                <div className="mt-2">
                                    <LineForm
                                        initial=""
                                        label={t("SecondBrainFactNewLabel")}
                                        onCancel={() => setEditing(null)}
                                        onSave={async (text) => {
                                            const ok = await onCreate({ kind, text });
                                            if (ok) setEditing(null);
                                            return ok;
                                        }}
                                    />
                                </div>
                            ) : (
                                !full && (
                                    <button
                                        type="button"
                                        onClick={() => setEditing({ mode: "new", kind })}
                                        className="mt-2 inline-flex items-center gap-1.5 rounded-control py-1 text-[13px] font-semibold text-accent transition-colors duration-200 hover:text-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                                        data-testid={`second-brain-fact-add-${kind}`}
                                    >
                                        <Plus size={14} aria-hidden="true" />
                                        {t("SecondBrainFactAdd")}
                                    </button>
                                )
                            )}
                        </div>
                    );
                })}
            </div>
            {full && <p className="mt-5 text-[13px] leading-snug text-text-2">{t("SECOND_BRAIN_FACT_LIMIT_REACHED")}</p>}
        </Block>
    );
}
