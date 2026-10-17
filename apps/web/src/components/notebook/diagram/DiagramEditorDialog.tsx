import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Plus, Sparkles, Trash2, X } from "lucide-react";
import {
    DIAGRAM_KINDS, DIAGRAM_LIMITS, type DiagramKind, type DiagramSpec, type DiagramTone,
} from "@beyou/types/notebook/diagram";
import { sanitizeDiagram } from "@beyou/state";
import { generateDiagram } from "@beyou/api/notebook";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import Modal from "../../modals/Modal";
import ErrorNotice from "../../ErrorNotice";
import { AiWaitingLine } from "../aiWaiting";
import DiagramView from "./DiagramView";
import { kindFits, useDiagramColors, usesLinks } from "./diagramUi";

/** The swatches in the order the design shows them: the accent first, then the plain box. */
const TONE_ORDER: DiagramTone[] = ["ACCENT", "NEUTRAL", "SUCCESS", "WARNING", "DANGER"];

type DraftNode = { id: string; label: string; detail: string; tone: DiagramTone };
type DraftLink = { key: number; from: string; to: string; label: string; dashed: boolean };
type Draft = { kind: DiagramKind; title: string; nodes: DraftNode[]; links: DraftLink[] };

const toDraft = (spec: DiagramSpec, nextKey: () => number): Draft => ({
    kind: spec.kind,
    title: spec.title,
    nodes: spec.nodes.map((node) => ({ id: node.id, label: node.label, detail: node.detail ?? "", tone: node.tone })),
    links: spec.links.map((link) => ({ key: nextKey(), from: link.from, to: link.to, label: link.label ?? "", dashed: link.dashed })),
});

/** The draft as the sanitizer reads it; blank labels and dangling links are its to drop. */
const fromDraft = (draft: Draft) => ({
    v: 1,
    kind: draft.kind,
    title: draft.title,
    nodes: draft.nodes.map((node) => ({ id: node.id, label: node.label, detail: node.detail, tone: node.tone })),
    links: draft.links.map((link) => ({ from: link.from, to: link.to, label: link.label, dashed: link.dashed })),
});

/** The first `n<k>` no box uses yet. */
const freeId = (nodes: DraftNode[]): string => {
    const taken = new Set(nodes.map((node) => node.id));
    let k = nodes.length + 1;
    while (taken.has(`n${k}`)) k++;
    return `n${k}`;
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    spec: DiagramSpec;
    /** The page the AI reads for "Adjust with AI". Without one the AI box is left out. */
    pageId?: string | null;
    /** Open with the cursor in the AI box ("Adjust with AI" on the toolbar, "Adjust" in the chat). */
    focusInstruction?: boolean;
    onSave: (spec: DiagramSpec) => void;
};

/**
 * Edits a diagram by hand or by asking the AI, with the drawing redone on every change. The
 * edit is a draft until "Save": the sanitizer cleans it the same way the server would, and a
 * diagram with fewer than two boxes cannot be saved.
 *
 * Links are listed only for the kinds that draw them; layers and timelines ignore links, so the
 * list goes away for those (the links themselves are kept, for a switch back).
 */
export default function DiagramEditorDialog({ isOpen, onClose, spec, pageId = null, focusInstruction = false, onSave }: Props) {
    const { t } = useTranslation();
    const uid = useId();
    const colors = useDiagramColors();
    const keys = useRef(0);
    const nextKey = () => ++keys.current;
    const titleRef = useRef<HTMLInputElement>(null);
    const instructionRef = useRef<HTMLTextAreaElement>(null);
    const [draft, setDraft] = useState<Draft>(() => toDraft(spec, nextKey));
    const [instruction, setInstruction] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<ApiErrorPayload | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setDraft(toDraft(spec, nextKey));
        setInstruction("");
        setBusy(false);
        setError(null);
        // After the Modal's own focus, which lands on the first button.
        (focusInstruction && pageId ? instructionRef.current : titleRef.current)?.focus();
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const clean = useMemo(() => sanitizeDiagram(fromDraft(draft)), [draft]);
    const cap = Math.min(DIAGRAM_LIMITS.maxNodes, DIAGRAM_LIMITS.kindNodes[draft.kind]);
    const showLinks = usesLinks(draft.kind);

    const patchNode = (index: number, patch: Partial<DraftNode>) =>
        setDraft((current) => ({ ...current, nodes: current.nodes.map((node, i) => (i === index ? { ...node, ...patch } : node)) }));
    const removeNode = (index: number) =>
        setDraft((current) => {
            const gone = current.nodes[index]?.id;
            return {
                ...current,
                nodes: current.nodes.filter((_, i) => i !== index),
                links: current.links.filter((link) => link.from !== gone && link.to !== gone),
            };
        });
    const addNode = () =>
        setDraft((current) => current.nodes.length >= cap ? current : {
            ...current,
            nodes: [...current.nodes, { id: freeId(current.nodes), label: "", detail: "", tone: "NEUTRAL" }],
        });
    const patchLink = (key: number, patch: Partial<DraftLink>) =>
        setDraft((current) => ({ ...current, links: current.links.map((link) => (link.key === key ? { ...link, ...patch } : link)) }));
    const removeLink = (key: number) => setDraft((current) => ({ ...current, links: current.links.filter((link) => link.key !== key) }));
    const addLink = () =>
        setDraft((current) => {
            if (current.nodes.length < 2 || current.links.length >= DIAGRAM_LIMITS.maxLinks) return current;
            return {
                ...current,
                links: [...current.links, { key: nextKey(), from: current.nodes[0].id, to: current.nodes[1].id, label: "", dashed: false }],
            };
        });

    const adjust = async () => {
        const text = instruction.trim();
        if (!text || busy || !pageId) return;
        setBusy(true);
        setError(null);
        const response = await generateDiagram(pageId, { prompt: text, kind: draft.kind, grounded: true, base: clean }, t);
        setBusy(false);
        if (response.success) {
            setDraft(toDraft(response.success.diagram, nextKey));
            setInstruction("");
        } else {
            setError(response.error ?? null);
        }
    };

    const save = () => {
        if (!clean) return;
        onSave(clean);
        onClose();
    };

    const boxName = (node: DraftNode, index: number) => node.label.trim() || t("DiagramBoxFallback", { n: index + 1 });
    const fieldClass = "h-[38px] min-w-0 rounded-[9px] border border-border bg-surface px-2.5 text-sm text-text outline-none placeholder:text-text-3 focus:border-accent";

    return (
        <Modal isOpen={isOpen} onClose={onClose} labelledBy={`${uid}-title`} className="!max-h-[94vh] !max-w-[min(1180px,96vw)]">
            <div data-testid="diagram-editor" className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 id={`${uid}-title`} className="text-[22px] font-semibold tracking-[-0.02em] text-text">{t("DiagramEditTitle")}</h2>
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} data-testid="diagram-cancel"
                            className="h-[42px] rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text hover:bg-surface-2">
                            {t("DiagramCancel")}
                        </button>
                        <button type="button" onClick={save} disabled={!clean || busy} data-testid="diagram-save"
                            className="h-[42px] rounded-control bg-accent px-[18px] text-sm font-semibold text-on-accent hover:bg-accent-strong disabled:opacity-60">
                            {t("DiagramSave")}
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-start gap-5">
                    <section aria-label={t("DiagramPreview")}
                        className="flex min-w-0 flex-[999_1_520px] flex-col gap-3.5 rounded-card border border-border bg-surface p-4 md:p-5">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1.5">
                                <label htmlFor={`${uid}-name`} className="text-xs font-semibold text-text-2">{t("DiagramTitleLabel")}</label>
                                <input ref={titleRef} id={`${uid}-name`} value={draft.title} maxLength={DIAGRAM_LIMITS.title}
                                    onChange={(e) => setDraft((current) => ({ ...current, title: e.target.value }))}
                                    data-testid="diagram-title"
                                    className="h-[42px] rounded-control border border-border bg-surface px-3 text-base font-semibold text-text outline-none focus:border-accent" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor={`${uid}-kind`} className="text-xs font-semibold text-text-2">{t("DiagramKindPicker")}</label>
                                <select id={`${uid}-kind`} value={draft.kind} data-testid="diagram-editor-kind"
                                    onChange={(e) => setDraft((current) => ({ ...current, kind: e.target.value as DiagramKind }))}
                                    className="h-[42px] min-w-[170px] rounded-control border border-border bg-surface px-3 text-sm font-medium text-text outline-none focus:border-accent">
                                    {DIAGRAM_KINDS.map((kind) => {
                                        const fits = kindFits(kind, draft.nodes.length);
                                        return (
                                            <option key={kind} value={kind} disabled={!fits}>
                                                {t(`DiagramKind${kind}`)}{fits ? "" : ` (${t("DiagramKindTooMany", { max: DIAGRAM_LIMITS.kindNodes[kind] })})`}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>
                        <div className="rounded-[12px] bg-bg p-3 md:p-4">
                            {clean ? (
                                <DiagramView spec={clean} maxScale={1.2} />
                            ) : (
                                <p role="alert" data-testid="diagram-too-few"
                                    className="px-4 py-10 text-center text-sm text-text-2">{t("DiagramTooFewBoxes")}</p>
                            )}
                        </div>
                        <p className="text-[12.5px] text-text-2">{t("DiagramAutoLayoutHint")}</p>
                    </section>

                    <aside aria-label={t("DiagramBoxes")}
                        className="flex min-w-0 max-w-full flex-[1_1_380px] flex-col gap-[18px] rounded-card border border-border bg-surface p-4 md:max-w-[480px] md:p-5">
                        {pageId && (
                            <div className="flex flex-col gap-2 rounded-[12px] border border-accent/20 bg-accent/5 p-3.5">
                                <label htmlFor={`${uid}-ai`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent">
                                    <Sparkles size={14} aria-hidden="true" />{t("DiagramInstructionLabel")}
                                </label>
                                <textarea ref={instructionRef} id={`${uid}-ai`} rows={2} value={instruction} maxLength={1000}
                                    onChange={(e) => setInstruction(e.target.value)}
                                    placeholder={t("DiagramInstructionPlaceholder")}
                                    data-testid="diagram-instruction"
                                    className="w-full resize-none rounded-control border border-border bg-surface px-[11px] py-[9px] text-sm leading-5 text-text outline-none placeholder:text-text-3 focus:border-accent" />
                                <div className="flex items-center justify-between gap-2">
                                    {busy ? (
                                        <span role="status" className="text-xs text-text-2"><AiWaitingLine label={t("DiagramGenerating")} /></span>
                                    ) : (
                                        <span className="text-xs text-text-2">{t("DiagramReviewHint")}</span>
                                    )}
                                    <button type="button" onClick={() => void adjust()} disabled={busy || !instruction.trim()} data-testid="diagram-apply"
                                        className="h-9 shrink-0 rounded-[9px] bg-accent px-3.5 text-[13px] font-semibold text-on-accent hover:bg-accent-strong disabled:opacity-60">
                                        {t("DiagramApply")}
                                    </button>
                                </div>
                                <ErrorNotice error={error} />
                            </div>
                        )}

                        <div className="flex flex-col gap-2.5">
                            <h3 className="text-sm font-semibold text-text">{t("DiagramBoxes")}</h3>
                            {draft.nodes.map((node, index) => (
                                <div key={node.id} className="flex flex-col gap-1.5" data-testid="diagram-box-row">
                                    <div className="flex items-center gap-2">
                                        <input value={node.label} maxLength={DIAGRAM_LIMITS.label}
                                            onChange={(e) => patchNode(index, { label: e.target.value })}
                                            aria-label={t("DiagramBoxLabel", { n: index + 1 })}
                                            data-testid={`diagram-box-label-${index}`}
                                            className={`${fieldClass} flex-1 font-medium`} />
                                        <div role="radiogroup" aria-label={t("DiagramBoxTone", { n: index + 1 })} className="flex gap-0.5">
                                            {TONE_ORDER.map((tone) => {
                                                const checked = node.tone === tone;
                                                const swatch = colors.tones[tone];
                                                return (
                                                    <label key={tone} title={t(`DiagramTone${tone}`)}
                                                        className={`relative flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-full border-2 ${
                                                            checked ? "border-text-2" : "border-transparent"} has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent`}>
                                                        <input type="radio" name={`${uid}-tone-${node.id}`} value={tone} checked={checked}
                                                            onChange={() => patchNode(index, { tone })}
                                                            aria-label={t(`DiagramTone${tone}`)}
                                                            className="sr-only" />
                                                        <span aria-hidden="true" className="h-3.5 w-3.5 rounded-full"
                                                            style={tone === "NEUTRAL"
                                                                ? { background: colors.surface, border: `1.5px solid ${swatch.dot}` }
                                                                : { background: swatch.dot }} />
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        <button type="button" onClick={() => removeNode(index)}
                                            aria-label={t("DiagramRemoveBox", { label: boxName(node, index) })}
                                            data-testid={`diagram-box-remove-${index}`}
                                            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[8px] text-text-2 hover:bg-surface-2 hover:text-danger">
                                            <Trash2 size={15} aria-hidden="true" />
                                        </button>
                                    </div>
                                    <input value={node.detail} maxLength={DIAGRAM_LIMITS.detail}
                                        onChange={(e) => patchNode(index, { detail: e.target.value })}
                                        aria-label={t("DiagramBoxDetail", { n: index + 1 })}
                                        placeholder={t("DiagramBoxDetail", { n: index + 1 })}
                                        data-testid={`diagram-box-detail-${index}`}
                                        className={`${fieldClass} h-[34px] text-[13px] text-text-2`} />
                                </div>
                            ))}
                            <button type="button" onClick={addNode} disabled={draft.nodes.length >= cap} data-testid="diagram-add-box"
                                title={draft.nodes.length >= cap ? t("DiagramKindTooMany", { max: cap }) : undefined}
                                className="inline-flex h-9 items-center gap-1.5 self-start rounded-[9px] border border-dashed border-border bg-surface px-3 text-[13px] font-semibold text-text hover:bg-surface-2 disabled:opacity-60">
                                <Plus size={14} aria-hidden="true" />{t("DiagramAddBox")}
                            </button>
                        </div>

                        {showLinks ? (
                            <div className="flex flex-col gap-2.5">
                                <h3 className="text-sm font-semibold text-text">{t("DiagramLinks")}</h3>
                                {draft.links.map((link, index) => (
                                    <div key={link.key} className="flex flex-col gap-1.5" data-testid="diagram-link-row">
                                        <div className="flex items-center gap-1.5">
                                            <select value={link.from} onChange={(e) => patchLink(link.key, { from: e.target.value })}
                                                aria-label={t("DiagramLinkFrom")} data-testid={`diagram-link-from-${index}`}
                                                className={`${fieldClass} h-9 flex-1 px-2 text-[13px] font-medium`}>
                                                {draft.nodes.map((node, i) => <option key={node.id} value={node.id}>{boxName(node, i)}</option>)}
                                            </select>
                                            <ArrowRight size={16} className="shrink-0 text-text-3" aria-hidden="true" />
                                            <select value={link.to} onChange={(e) => patchLink(link.key, { to: e.target.value })}
                                                aria-label={t("DiagramLinkTo")} data-testid={`diagram-link-to-${index}`}
                                                className={`${fieldClass} h-9 flex-1 px-2 text-[13px] font-medium`}>
                                                {draft.nodes.map((node, i) => <option key={node.id} value={node.id}>{boxName(node, i)}</option>)}
                                            </select>
                                            <button type="button" onClick={() => removeLink(link.key)} aria-label={t("DiagramRemoveLink")}
                                                data-testid={`diagram-link-remove-${index}`}
                                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-text-2 hover:bg-surface-2 hover:text-danger">
                                                <X size={14} aria-hidden="true" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input value={link.label} maxLength={DIAGRAM_LIMITS.linkLabel}
                                                onChange={(e) => patchLink(link.key, { label: e.target.value })}
                                                aria-label={t("DiagramLinkLabel")} placeholder={t("DiagramLinkLabel")}
                                                data-testid={`diagram-link-label-${index}`}
                                                className={`${fieldClass} h-9 flex-1 px-2 text-[13px]`} />
                                            <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-[13px] text-text-2">
                                                <input type="checkbox" checked={link.dashed}
                                                    onChange={(e) => patchLink(link.key, { dashed: e.target.checked })}
                                                    data-testid={`diagram-link-dashed-${index}`}
                                                    className="h-4 w-4 accent-accent" />
                                                {t("DiagramLinkDashed")}
                                            </label>
                                        </div>
                                    </div>
                                ))}
                                <button type="button" onClick={addLink}
                                    disabled={draft.nodes.length < 2 || draft.links.length >= DIAGRAM_LIMITS.maxLinks}
                                    data-testid="diagram-add-link"
                                    className="inline-flex h-9 items-center gap-1.5 self-start rounded-[9px] border border-dashed border-border bg-surface px-3 text-[13px] font-semibold text-text hover:bg-surface-2 disabled:opacity-60">
                                    <Plus size={14} aria-hidden="true" />{t("DiagramAddLink")}
                                </button>
                            </div>
                        ) : (
                            <p className="text-[12.5px] text-text-2" data-testid="diagram-links-unused">{t("DiagramLinksUnused")}</p>
                        )}
                    </aside>
                </div>
            </div>
        </Modal>
    );
}
