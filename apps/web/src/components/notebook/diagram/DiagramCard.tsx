import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Lightbulb } from "lucide-react";
import type { DiagramSpec } from "@beyou/types/notebook/diagram";
import DiagramView from "./DiagramView";
import { KIND_ICONS } from "./diagramUi";

/** Where a diagram's content came from: the person's notes and sources, or the AI's own knowledge. */
export type DiagramSource = "notes" | "ai";

type Props = {
    spec: DiagramSpec | null;
    /**
     * `chat` is the card under an answer (icon, source chip, actions below); `block` is the one in
     * a page, which carries its actions in a floating toolbar instead.
     */
    variant?: "chat" | "block";
    source?: DiagramSource | null;
    sourceTestId?: string;
    /** Buttons under the drawing. */
    actions?: ReactNode;
    testId?: string;
    /** The block's "this one is selected" ring. */
    selected?: boolean;
    className?: string;
};

/** "Fluxo · 5 itens": the kind and the number of boxes. */
export function useDiagramMeta(spec: DiagramSpec | null): string {
    const { t } = useTranslation();
    if (!spec) return "";
    return t("DiagramMeta", { kind: t(`DiagramKind${spec.kind}`), count: spec.nodes.length });
}

/** The chip that says where the content came from. */
export function DiagramSourceChip({ source, testId }: { source: DiagramSource; testId?: string }) {
    const { t } = useTranslation();
    return source === "notes" ? (
        <span data-testid={testId}
            className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-success/10 px-2.5 text-xs font-semibold text-success">
            <BookOpen size={12} strokeWidth={2.25} aria-hidden="true" />{t("DiagramFromNotes")}
        </span>
    ) : (
        <span data-testid={testId}
            className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-2.5 text-xs font-semibold text-text-2">
            <Lightbulb size={12} strokeWidth={2.25} aria-hidden="true" />{t("DiagramFromAi")}
        </span>
    );
}

/**
 * A diagram with its title and "<kind> · N items" line, on the panel color the drawing's edge
 * labels are cut out of. The study room, the assistant and the page block all use it.
 */
export default function DiagramCard({
    spec, variant = "chat", source = null, sourceTestId, actions, testId = "diagram-card", selected = false, className = "",
}: Props) {
    const { t } = useTranslation();
    const meta = useDiagramMeta(spec);
    const title = spec?.title || t("DiagramUntitled");
    const Icon = spec ? KIND_ICONS[spec.kind] : KIND_ICONS.FLOW;
    const block = variant === "block";

    return (
        <figure
            data-testid={testId}
            className={`m-0 flex min-w-0 flex-col gap-3 rounded-[14px] border border-border bg-surface ${
                block ? "p-[18px]" : "p-3.5 shadow-surface"} ${
                selected ? "outline outline-2 outline-offset-[3px] outline-accent" : ""} ${className}`}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    {!block && (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-accent-soft text-accent">
                            <Icon size={15} aria-hidden="true" />
                        </span>
                    )}
                    <figcaption className="flex min-w-0 flex-col gap-px">
                        <span className={`truncate font-semibold text-text ${block ? "text-[15px]" : "text-sm"}`}>{title}</span>
                        {meta && <span className="text-xs text-text-2">{meta}</span>}
                    </figcaption>
                </div>
                {source && <DiagramSourceChip source={source} testId={sourceTestId} />}
            </div>
            <div className={`rounded-[12px] bg-bg ${block ? "px-1.5 py-2.5" : "px-1 py-2"}`}>
                <DiagramView spec={spec} />
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </figure>
    );
}
