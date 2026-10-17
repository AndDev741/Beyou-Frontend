import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, RefreshCw, Sparkles, X } from "lucide-react";
import { DIAGRAM_KINDS, type DiagramKind, type DiagramResult, type DiagramSpec } from "@beyou/types/notebook/diagram";
import { generateDiagram } from "@beyou/api/notebook";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import Modal from "../../modals/Modal";
import ErrorNotice from "../../ErrorNotice";
import { AiWaitingLine } from "../aiWaiting";
import DiagramView from "./DiagramView";
import { DiagramSourceChip } from "./DiagramCard";
import { KIND_ICONS } from "./diagramUi";

const PROMPT_MAX = 1000;

type Props = {
    isOpen: boolean;
    onClose: () => void;
    pageId: string;
    pageTitle: string;
    /** "Insert into page": the editor puts it where the slash was typed. */
    onInsert: (spec: DiagramSpec) => void;
};

/**
 * "/diagram": ask the AI for a diagram, see it, and put it in the page. Nothing is written until
 * "Insert into page"; the block then saves with the page like anything else typed there.
 *
 * The kind can be left to the AI (it says which it picked) and the drawing can be based on this
 * page's notes and sources or on what the AI already knows. When it was based on the notes and
 * there were notes to read, a chip says so.
 */
export default function DiagramGeneratorDialog({ isOpen, onClose, pageId, pageTitle, onInsert }: Props) {
    const { t } = useTranslation();
    const titleId = useId();
    const promptId = useId();
    const kindId = useId();
    const groundId = useId();
    const promptRef = useRef<HTMLTextAreaElement>(null);
    const [prompt, setPrompt] = useState("");
    const [kind, setKind] = useState<DiagramKind | null>(null);
    const [grounded, setGrounded] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<ApiErrorPayload | null>(null);
    const [result, setResult] = useState<(DiagramResult & { picked: boolean }) | null>(null);

    // A fresh dialog each time it opens.
    useEffect(() => {
        if (!isOpen) return;
        setPrompt("");
        setKind(null);
        setGrounded(true);
        setBusy(false);
        setError(null);
        setResult(null);
        // The shared Modal focuses its first control (the close button); the question is where
        // the person starts. Runs after the Modal's own effect, so it wins.
        promptRef.current?.focus();
    }, [isOpen]);

    const generate = async () => {
        const text = prompt.trim();
        if (!text || busy) return;
        setBusy(true);
        setError(null);
        const response = await generateDiagram(pageId, { prompt: text, kind, grounded, base: null }, t);
        setBusy(false);
        if (response.success) setResult({ ...response.success, picked: kind === null });
        else setError(response.error ?? null);
    };

    const insert = () => {
        if (!result) return;
        onInsert(result.diagram);
        onClose();
    };

    const chip = (value: DiagramKind | null) => {
        const active = kind === value;
        return (
            <button
                key={value ?? "auto"}
                type="button"
                aria-pressed={active}
                onClick={() => setKind(value)}
                disabled={busy}
                title={value ? t(`DiagramKindHint${value}`) : undefined}
                data-testid={value ? `diagram-kind-${value}` : "diagram-kind-auto"}
                className={`inline-flex h-[34px] items-center gap-1.5 rounded-full border px-3 text-[13px] disabled:opacity-60 ${
                    active ? "border-accent bg-accent-soft font-semibold text-accent" : "border-border bg-surface font-medium text-text hover:bg-surface-2"}`}
            >
                {active && <Check size={13} strokeWidth={2.5} aria-hidden="true" />}
                {value ? t(`DiagramKind${value}`) : t("DiagramKindAuto")}
            </button>
        );
    };

    const PickedIcon = result ? KIND_ICONS[result.diagram.kind] : null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} labelledBy={titleId} className="!max-w-[760px]">
            <div data-testid="diagram-generator" className="flex flex-col gap-[18px]">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-[3px]">
                        <h2 id={titleId} className="text-[19px] font-semibold text-text">{t("DiagramNewTitle")}</h2>
                        <span className="text-[13px] text-text-2">{t("DiagramNewWhere", { title: pageTitle })}</span>
                    </div>
                    <button type="button" onClick={onClose} aria-label={t("Close")}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-text-2 hover:bg-surface-2 hover:text-text">
                        <X size={18} aria-hidden="true" />
                    </button>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor={promptId} className="text-[13px] font-semibold text-text">{t("DiagramPromptLabel")}</label>
                    <textarea
                        ref={promptRef}
                        id={promptId}
                        rows={2}
                        value={prompt}
                        maxLength={PROMPT_MAX}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => {
                            // Ctrl/Cmd+Enter draws, the way the other AI boxes send.
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                void generate();
                            }
                        }}
                        placeholder={t("DiagramPromptPlaceholder")}
                        data-testid="diagram-prompt"
                        className="w-full resize-none rounded-control border border-border bg-surface px-3 py-2.5 text-[15px] leading-[22px] text-text outline-none placeholder:text-text-3 focus:border-accent focus:ring-[3px] focus:ring-accent/15"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <span id={kindId} className="text-[13px] font-semibold text-text">{t("DiagramKindPicker")}</span>
                    <div role="group" aria-labelledby={kindId} className="flex flex-wrap gap-1.5">
                        {chip(null)}
                        {DIAGRAM_KINDS.map((value) => chip(value))}
                    </div>
                </div>

                <div className="flex items-center gap-3 rounded-[12px] bg-bg px-3.5 py-3">
                    <button
                        type="button"
                        role="switch"
                        aria-checked={grounded}
                        aria-labelledby={groundId}
                        aria-describedby={`${groundId}-hint`}
                        onClick={() => setGrounded((value) => !value)}
                        disabled={busy}
                        data-testid="diagram-grounded"
                        className={`flex h-[26px] w-11 shrink-0 items-center rounded-full p-[3px] transition-colors disabled:opacity-60 ${
                            grounded ? "justify-end bg-accent" : "justify-start bg-border"}`}
                    >
                        <span aria-hidden="true" className={`h-5 w-5 rounded-full shadow-sm ${grounded ? "bg-on-accent" : "bg-text-3"}`} />
                    </button>
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <span id={groundId} className="text-sm font-semibold text-text">{t("DiagramGroundedLabel")}</span>
                        <span id={`${groundId}-hint`} className="text-[12.5px] text-text-2">{t("DiagramGroundedHint")}</span>
                    </div>
                </div>

                {(busy || result) && (
                    <div className="flex flex-col gap-2.5 rounded-[14px] border border-border p-3.5" data-testid="diagram-preview">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[13px] font-semibold text-text">{t("DiagramPreview")}</span>
                            {result && !busy && (
                                <div className="flex flex-wrap gap-1.5">
                                    {result.picked && PickedIcon && (
                                        <span data-testid="diagram-picked"
                                            className="inline-flex h-6 items-center gap-1.5 rounded-full bg-accent-soft px-2.5 text-xs font-semibold text-accent">
                                            <PickedIcon size={12} strokeWidth={2.25} aria-hidden="true" />
                                            {t("DiagramChosenByAi", { kind: t(`DiagramKind${result.diagram.kind}`) })}
                                        </span>
                                    )}
                                    {result.fromNotes && <DiagramSourceChip source="notes" testId="diagram-from-notes" />}
                                </div>
                            )}
                        </div>
                        <div className="rounded-[12px] bg-bg px-1 py-2">
                            {busy ? (
                                <p role="status" className="flex min-h-[160px] items-center justify-center px-4 text-sm text-text-2">
                                    <AiWaitingLine label={t("DiagramGenerating")} />
                                </p>
                            ) : (
                                result && <DiagramView spec={result.diagram} />
                            )}
                        </div>
                    </div>
                )}

                <ErrorNotice error={error} />

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[13px] text-text-2">{t("DiagramAdjustLater")}</span>
                    <div className="flex flex-wrap gap-2">
                        {result ? (
                            <>
                                <button type="button" onClick={() => void generate()} disabled={busy || !prompt.trim()} data-testid="diagram-regenerate"
                                    className="inline-flex h-[42px] items-center gap-2 rounded-control border border-border bg-surface px-3.5 text-sm font-semibold text-text hover:bg-surface-2 disabled:opacity-60">
                                    <RefreshCw size={16} aria-hidden="true" />{t("DiagramRegenerate")}
                                </button>
                                <button type="button" onClick={insert} disabled={busy} data-testid="diagram-insert"
                                    className="inline-flex h-[42px] items-center rounded-control bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-strong disabled:opacity-60">
                                    {t("DiagramInsert")}
                                </button>
                            </>
                        ) : (
                            <button type="button" onClick={() => void generate()} disabled={busy || !prompt.trim()} data-testid="diagram-generate"
                                className="inline-flex h-[42px] items-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-strong disabled:opacity-60">
                                <Sparkles size={16} aria-hidden="true" />
                                {busy ? t("DiagramGenerating") : t("DiagramGenerate")}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
