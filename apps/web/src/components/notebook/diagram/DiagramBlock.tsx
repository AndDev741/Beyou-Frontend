import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Check, ChevronDown, Download, Maximize2, Pencil, Sparkles } from "lucide-react";
import { DIAGRAM_KINDS, DIAGRAM_LIMITS, type DiagramKind, type DiagramSpec } from "@beyou/types/notebook/diagram";
import { parseDiagramProp, sanitizeDiagram } from "@beyou/state";
import DiagramCard from "./DiagramCard";
import DiagramEditorDialog from "./DiagramEditorDialog";
import DiagramFullscreen from "./DiagramFullscreen";
import { downloadDiagramPng, downloadDiagramSvg } from "./diagramDownload";
import { KIND_ICONS, kindFits, useDiagramColors } from "./diagramUi";

type Props = {
    pageId: string;
    /** The block's `spec` prop: the spec as a JSON string, cleaned again on read. */
    specProp: string;
    /** The editor's cursor is on this block. */
    selected?: boolean;
    /** A changed diagram, for the editor to store in the block (and so in the page). */
    onChange: (next: DiagramSpec) => void;
};

/**
 * A diagram inside a page: the card, and on hover, focus or selection the toolbar above it
 * (adjust with AI, edit, switch kind, full screen, download).
 *
 * Every change goes back through `onChange`, which updates the block's prop, so autosave writes
 * it with the rest of the page. Events stop at the block so the editor around it never reads a
 * click in a menu as a text selection or a key in a dialog as typing in the document.
 */
export default function DiagramBlock({ pageId, specProp, selected = false, onChange }: Props) {
    const { t } = useTranslation();
    const colors = useDiagramColors();
    const spec = useMemo(() => parseDiagramProp(specProp), [specProp]);
    const [editing, setEditing] = useState<"edit" | "adjust" | null>(null);
    const [fullscreen, setFullscreen] = useState(false);
    const [menu, setMenu] = useState<"kind" | "download" | null>(null);
    const [hovered, setHovered] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    // A click anywhere else closes an open menu.
    useEffect(() => {
        if (!menu) return;
        const onPointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setMenu(null);
        };
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [menu]);

    const switchKind = (kind: DiagramKind) => {
        setMenu(null);
        if (!spec || kind === spec.kind) return;
        // The same boxes and links, drawn as the other kind; the sanitizer applies that kind's rules.
        const next = sanitizeDiagram({ ...spec, kind });
        if (next) onChange(next);
    };

    const download = async (format: "svg" | "png") => {
        setMenu(null);
        if (!spec) return;
        try {
            if (format === "svg") downloadDiagramSvg(spec, colors);
            else await downloadDiagramPng(spec, colors);
        } catch {
            toast.error(t("DiagramDownloadFailed"));
        }
    };

    const onMenuKeyDown = (event: ReactKeyboardEvent) => {
        if (event.key === "Escape" && menu) {
            event.preventDefault();
            setMenu(null);
        }
    };

    const active = selected || hovered || menu !== null;
    const KindIcon = spec ? KIND_ICONS[spec.kind] : null;

    return (
        <div
            ref={rootRef}
            data-testid="diagram-block"
            contentEditable={false}
            onKeyDown={(e) => { onMenuKeyDown(e); e.stopPropagation(); }}
            onPaste={(e) => e.stopPropagation()}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="group/diagram relative mb-2 mt-7 w-full"
        >
            {spec && (
                <div
                    role="toolbar"
                    aria-label={t("DiagramActions")}
                    data-testid="diagram-toolbar"
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`absolute -top-[26px] right-0 z-20 flex items-center gap-0.5 rounded-[12px] border border-border bg-surface p-1 shadow-surface transition-opacity duration-150 focus-within:opacity-100 ${
                        active ? "opacity-100" : "pointer-events-none opacity-0 group-focus-within/diagram:pointer-events-auto group-focus-within/diagram:opacity-100"}`}
                >
                    <button type="button" onClick={() => setEditing("adjust")} data-testid="diagram-adjust"
                        className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-accent-soft px-2.5 text-[13px] font-semibold text-accent hover:brightness-95">
                        <Sparkles size={15} aria-hidden="true" />
                        {/* Icons only on a phone, where the full toolbar would not fit above the card. */}
                        <span className="sr-only md:not-sr-only">{t("DiagramAdjustWithAi")}</span>
                    </button>
                    <button type="button" onClick={() => setEditing("edit")} data-testid="diagram-edit"
                        className="inline-flex h-9 items-center gap-1.5 rounded-[8px] px-2.5 text-[13px] font-semibold text-text hover:bg-surface-2">
                        <Pencil size={15} aria-hidden="true" />
                        <span className="sr-only md:not-sr-only">{t("DiagramEdit")}</span>
                    </button>
                    <Divider />
                    <div className="relative">
                        <button type="button" aria-haspopup="listbox" aria-expanded={menu === "kind"}
                            aria-label={t("DiagramKindLabel", { kind: t(`DiagramKind${spec.kind}`) })}
                            onClick={() => setMenu((open) => (open === "kind" ? null : "kind"))}
                            data-testid="diagram-kind-switch"
                            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] pl-2.5 pr-2 text-[13px] font-semibold text-text hover:bg-surface-2">
                            {KindIcon && <KindIcon size={15} aria-hidden="true" />}
                            <span className="hidden md:inline">{t(`DiagramKind${spec.kind}`)}</span>
                            <ChevronDown size={14} aria-hidden="true" />
                        </button>
                        {menu === "kind" && (
                            <Popover>
                                <ul role="listbox" aria-label={t("DiagramKindPicker")} className="flex flex-col">
                                    {DIAGRAM_KINDS.map((kind) => {
                                        const Icon = KIND_ICONS[kind];
                                        const fits = kindFits(kind, spec.nodes.length);
                                        const current = kind === spec.kind;
                                        return (
                                            <li key={kind}>
                                                <button type="button" role="option" aria-selected={current} disabled={!fits}
                                                    onClick={() => switchKind(kind)}
                                                    data-testid={`diagram-kind-option-${kind}`}
                                                    className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50">
                                                    <Icon size={15} className="shrink-0 text-text-2" aria-hidden="true" />
                                                    <span className="flex min-w-0 flex-1 flex-col">
                                                        <span className="text-[13px] font-semibold text-text">{t(`DiagramKind${kind}`)}</span>
                                                        <span className="text-xs text-text-2">
                                                            {fits ? t(`DiagramKindHint${kind}`) : t("DiagramKindTooMany", { max: DIAGRAM_LIMITS.kindNodes[kind] })}
                                                        </span>
                                                    </span>
                                                    {current && <Check size={14} className="shrink-0 text-accent" aria-hidden="true" />}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </Popover>
                        )}
                    </div>
                    <Divider />
                    <button type="button" onClick={() => setFullscreen(true)} aria-label={t("DiagramFullscreen")} title={t("DiagramFullscreen")}
                        data-testid="diagram-fullscreen"
                        className="flex h-9 w-9 items-center justify-center rounded-[8px] text-text hover:bg-surface-2">
                        <Maximize2 size={15} aria-hidden="true" />
                    </button>
                    <div className="relative">
                        <button type="button" aria-haspopup="menu" aria-expanded={menu === "download"}
                            aria-label={t("DiagramDownload")} title={t("DiagramDownload")}
                            onClick={() => setMenu((open) => (open === "download" ? null : "download"))}
                            data-testid="diagram-download"
                            className="flex h-9 w-9 items-center justify-center rounded-[8px] text-text hover:bg-surface-2">
                            <Download size={15} aria-hidden="true" />
                        </button>
                        {menu === "download" && (
                            <Popover narrow>
                                <div role="menu" aria-label={t("DiagramDownload")} className="flex flex-col">
                                    <button type="button" role="menuitem" onClick={() => void download("svg")} data-testid="diagram-download-svg"
                                        className="rounded-[8px] px-3 py-2 text-left text-[13px] font-semibold text-text hover:bg-surface-2">
                                        {t("DiagramDownloadSvg")}
                                    </button>
                                    <button type="button" role="menuitem" onClick={() => void download("png")} data-testid="diagram-download-png"
                                        className="rounded-[8px] px-3 py-2 text-left text-[13px] font-semibold text-text hover:bg-surface-2">
                                        {t("DiagramDownloadPng")}
                                    </button>
                                </div>
                            </Popover>
                        )}
                    </div>
                </div>
            )}

            <DiagramCard spec={spec} variant="block" selected={selected} />

            {spec && editing && (
                <DiagramEditorDialog
                    isOpen
                    onClose={() => setEditing(null)}
                    spec={spec}
                    pageId={pageId}
                    focusInstruction={editing === "adjust"}
                    onSave={onChange}
                />
            )}
            <DiagramFullscreen spec={spec} isOpen={fullscreen} onClose={() => setFullscreen(false)} />
        </div>
    );
}

function Divider() {
    return <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />;
}

function Popover({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
    return (
        <div className={`absolute right-0 top-[calc(100%+6px)] z-30 rounded-[12px] border border-border bg-surface p-1 shadow-surface ${
            narrow ? "w-40" : "w-64"}`}>
            {children}
        </div>
    );
}
