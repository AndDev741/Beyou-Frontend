import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useDispatch, useStore } from "react-redux";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { ChevronRight, FilePlus, Maximize2 } from "lucide-react";
import type { agentSegment } from "@beyou/types/agent/chatType";
import type { PageSearchHit } from "@beyou/types/notebook/notebook";
import type { RootState } from "@beyou/state/rootReducer";
import { enterNotebookPage, refreshNotebook, sanitizeDiagram } from "@beyou/state";
import { appendDiagramToPage } from "@beyou/api/notebook";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import DiagramCard from "../notebook/diagram/DiagramCard";
import DiagramView from "../notebook/diagram/DiagramView";
import DiagramFullscreen from "../notebook/diagram/DiagramFullscreen";
import DiagramPagePicker from "../notebook/diagram/DiagramPagePicker";

type OnInternalLink = (href: string) => void;

/**
 * `showDiagram`: the assistant drew a diagram and saved nothing. It shows inline, with "Save to
 * notebook" (pick a page, the server appends it) and full screen.
 */
export function AgentDiagramShown({ segment }: { segment: agentSegment }) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const store = useStore<RootState>();
    const location = useLocation();
    const spec = useMemo(() => sanitizeDiagram(segment.diagram), [segment.diagram]);
    const [picking, setPicking] = useState(false);
    const [saving, setSaving] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);

    if (!spec) return null;

    const save = async (hit: PageSearchHit) => {
        setSaving(true);
        const response = await appendDiagramToPage(hit.id, spec, t);
        setSaving(false);
        if (!response.success) {
            toast.error(response.error?.errorKey ? getFriendlyErrorMessage(t, response.error) : t("DiagramSaveFailed"));
            return;
        }
        setPicking(false);
        toast.success(t("DiagramSaved", { title: response.success.title || hit.title }));
        // The page into the store first, so a page screen open behind the panel merges the new
        // block in rather than saving over it; then whatever else on screen shows the notebook.
        dispatch(enterNotebookPage(response.success));
        // Best effort: the diagram is saved whatever this re-read does.
        refreshNotebook(dispatch, store.getState().notebook, location.pathname, t).catch(() => undefined);
    };

    return (
        <>
            <DiagramCard
                spec={spec}
                testId="agent-diagram-card"
                source="ai"
                sourceTestId="agent-diagram-source"
                className="max-w-full"
                actions={
                    <>
                        <button type="button" onClick={() => setPicking(true)} disabled={saving} data-testid="agent-diagram-save"
                            className="inline-flex h-10 items-center gap-2 rounded-control bg-accent px-3.5 text-sm font-semibold text-on-accent hover:bg-accent-strong disabled:opacity-60">
                            <FilePlus size={16} aria-hidden="true" />{t("DiagramSaveToNotebook")}
                        </button>
                        <span className="flex-1" />
                        <button type="button" onClick={() => setFullscreen(true)} aria-label={t("DiagramFullscreen")} title={t("DiagramFullscreen")}
                            data-testid="agent-diagram-fullscreen"
                            className="flex h-10 w-10 items-center justify-center rounded-control border border-border bg-surface text-text hover:bg-surface-2">
                            <Maximize2 size={16} aria-hidden="true" />
                        </button>
                    </>
                }
            />
            <DiagramPagePicker isOpen={picking} onClose={() => setPicking(false)} onPick={(hit) => void save(hit)} busy={saving} />
            <DiagramFullscreen spec={spec} isOpen={fullscreen} onClose={() => setFullscreen(false)} />
        </>
    );
}

/**
 * `addStudyDiagram`: the assistant saved a diagram into a page. A card with a small preview, the
 * page's name and the way there.
 */
export function AgentDiagramAdded({ segment, onInternalLink }: { segment: agentSegment; onInternalLink?: OnInternalLink }) {
    const { t } = useTranslation();
    const spec = useMemo(() => sanitizeDiagram(segment.diagram), [segment.diagram]);
    if (!spec) return null;
    const href = segment.pageId ? `/notebook/${segment.pageId}` : null;
    const linkClass = "inline-flex w-fit items-center gap-0.5 rounded-control px-1 py-0.5 -ml-1 text-xs font-semibold text-accent hover:bg-surface-2";

    return (
        <div data-testid="agent-diagram-added" className="flex max-w-[92%] items-center gap-3 rounded-card border border-border bg-surface p-2.5">
            <div className="max-h-[84px] w-[112px] shrink-0 overflow-hidden rounded-[10px] bg-bg p-1 ring-1 ring-border">
                <DiagramView spec={spec} layoutWidth={480} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-semibold text-text">{t("DiagramToolAdded", { title: segment.pageTitle ?? "" })}</span>
                {spec.title && <span className="truncate text-xs text-text-2">{spec.title}</span>}
                {href && (onInternalLink ? (
                    <button type="button" onClick={() => onInternalLink(href)} data-testid="agent-diagram-open" className={linkClass}>
                        {t("DiagramOpenPage")}<ChevronRight size={13} aria-hidden="true" />
                    </button>
                ) : (
                    <Link to={href} data-testid="agent-diagram-open" className={linkClass}>
                        {t("DiagramOpenPage")}<ChevronRight size={13} aria-hidden="true" />
                    </Link>
                ))}
            </div>
        </div>
    );
}
