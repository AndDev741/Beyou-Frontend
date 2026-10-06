import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlignLeft, Link2, PanelLeftClose, Plus, Search, Trash2, Upload } from "lucide-react";
import type { NotebookSource } from "@beyou/types/notebook/notebook";
import { deleteSource, getSources, setSourceEnabled } from "@beyou/api/notebook";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import { toast } from "react-toastify";
import AddSourceDialog from "./AddSourceDialog";
import DiscoverSources from "./DiscoverSources";
import Modal from "../../modals/Modal";

/** How often the list re-reads while a source is still being read. */
export const SOURCE_POLL_MS = 2000;

type Props = {
    pageId: string;
    initialSources: NotebookSource[];
    /** Told whenever the list changes, so the room can show the count elsewhere. */
    onChange?: (sources: NotebookSource[]) => void;
    /** Whether "find sources for me" has a web search configured. */
    discovery?: boolean;
    /** Folds the panel into a rail (desktop). */
    onCollapse?: () => void;
};

const isReading = (s: NotebookSource) => s.status === "PENDING" || s.status === "READING";

/**
 * The sources this page reads: its own and those inherited from the pages above it.
 *
 * Sources are read in the background, so the list polls while any of them is still PENDING or
 * READING and stops the moment none is. Switching a source off keeps it in the list but out of
 * every answer, which is the cheap way to ask "what does the book say without my notes?".
 */
export default function SourcesPanel({ pageId, initialSources, onChange, discovery = false, onCollapse }: Props) {
    const { t } = useTranslation();
    const [sources, setSources] = useState<NotebookSource[]>(initialSources);
    const [adding, setAdding] = useState(false);
    const [finding, setFinding] = useState(false);

    useEffect(() => setSources(initialSources), [initialSources]);

    // Held in a ref so a parent that passes a new function every render does not restart the
    // polling clock below.
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    // The latest list, for additions that arrive one after another in the same render: "find
    // sources for me" adds each picked source in turn, and a stale list would drop the earlier ones.
    const latest = useRef(sources);
    latest.current = sources;

    const update = (next: NotebookSource[]) => {
        latest.current = next;
        setSources(next);
        onChangeRef.current?.(next);
    };

    const anyReading = sources.some(isReading);
    useEffect(() => {
        if (!anyReading) return;
        const id = setInterval(async () => {
            const response = await getSources(pageId, t);
            if (response.success) {
                setSources(response.success);
                onChangeRef.current?.(response.success);
            }
        }, SOURCE_POLL_MS);
        return () => clearInterval(id);
    }, [anyReading, pageId, t]);

    const toggle = async (source: NotebookSource) => {
        const response = await setSourceEnabled(source.id, !source.enabled, t);
        if (response.success) {
            update(sources.map((s) => (s.id === source.id ? { ...s, enabled: !source.enabled } : s)));
        } else {
            toast.error(getFriendlyErrorMessage(t, response.error));
        }
    };

    const remove = async (source: NotebookSource) => {
        const response = await deleteSource(source.id, t);
        if (response.error) {
            toast.error(getFriendlyErrorMessage(t, response.error));
            return;
        }
        update(sources.filter((s) => s.id !== source.id));
    };

    const onCount = sources.filter((s) => s.enabled).length;

    return (
        <section
            aria-labelledby="study-sources-title"
            className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface p-4"
        >
            <div className="flex items-center gap-2">
                <h2 id="study-sources-title" className="flex-1 text-[15px] font-semibold text-text">
                    {t("NotebookStudySources")}
                </h2>
                <button
                    type="button"
                    onClick={() => setAdding(true)}
                    data-testid="study-add-source"
                    className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-accent-soft px-3 text-[13px] font-semibold text-accent hover:bg-accent/15"
                >
                    <Plus size={14} aria-hidden="true" />
                    {t("NotebookStudyAdd")}
                </button>
                {onCollapse && (
                    <button type="button" onClick={onCollapse} aria-label={t("NotebookStudyCollapseSources")} title={t("NotebookStudyCollapseSources")}
                        data-testid="study-collapse-left"
                        className="hidden h-8 w-8 items-center justify-center rounded-[8px] text-text-2 hover:bg-surface-2 lg:inline-flex">
                        <PanelLeftClose size={16} aria-hidden="true" />
                    </button>
                )}
            </div>

            {sources.length === 0 ? (
                <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="flex items-center gap-3 rounded-card border border-dashed border-border p-3 text-left text-xs leading-5 text-text-2 hover:border-text-3"
                >
                    <Upload size={18} aria-hidden="true" className="shrink-0" />
                    <span>{t("NotebookStudySourcesEmpty")}</span>
                </button>
            ) : (
                <ul className="flex flex-col gap-1">
                    {sources.map((source) => (
                        <li
                            key={source.id}
                            data-testid="study-source-row"
                            className="flex items-center gap-2.5 rounded-control p-2 hover:bg-surface-2"
                        >
                            <KindTile source={source} />
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="truncate text-[13px] font-semibold text-text" title={source.title}>
                                    {source.title}
                                </span>
                                <SourceMeta source={source} />
                            </div>
                            {source.status === "READY" && (
                                <input
                                    type="checkbox"
                                    checked={source.enabled}
                                    onChange={() => toggle(source)}
                                    aria-label={t("NotebookStudyUseSource", { title: source.title })}
                                    className="h-4 w-4 accent-[var(--accent)]"
                                />
                            )}
                            {!source.inherited && (
                                <button
                                    type="button"
                                    onClick={() => remove(source)}
                                    aria-label={t("NotebookStudyDeleteSource", { title: source.title })}
                                    className="rounded-[8px] p-1.5 text-text-3 hover:bg-surface hover:text-danger"
                                >
                                    <Trash2 size={14} aria-hidden="true" />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {discovery && (
                <button type="button" onClick={() => setFinding(true)} data-testid="study-find-sources"
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[8px] border border-border px-3 text-[13px] font-semibold text-text hover:bg-surface-2">
                    <Search size={14} aria-hidden="true" />
                    {t("NotebookDiscoverTitle")}
                </button>
            )}

            <p className="mt-auto text-xs leading-5 text-text-2">
                {sources.length === 0
                    ? t("NotebookStudySourcesNotesOnly")
                    : t("NotebookStudySourcesOn", { on: onCount, total: sources.length })}
            </p>

            <AddSourceDialog
                pageId={pageId}
                isOpen={adding}
                onClose={() => setAdding(false)}
                onAdded={(source) => update([...sources, source])}
            />
            <Modal isOpen={finding} onClose={() => setFinding(false)} labelledBy="discover-title" className="!max-w-2xl">
                <div className="flex w-full flex-col gap-3">
                    <h2 id="discover-title" className="text-lg font-semibold text-text">{t("NotebookDiscoverTitle")}</h2>
                    <DiscoverSources pageId={pageId} autoFocus onAdded={(source) => update([...latest.current, source])} />
                </div>
            </Modal>
        </section>
    );
}

function KindTile({ source }: { source: NotebookSource }) {
    if (source.kind === "PDF") {
        return (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-danger/10 text-[9px] font-bold text-danger">
                PDF
            </span>
        );
    }
    const Icon = source.kind === "LINK" ? Link2 : AlignLeft;
    return (
        <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] ${
                source.kind === "LINK" ? "bg-accent-soft text-accent" : "bg-surface-2 text-text-2"
            }`}
        >
            <Icon size={15} aria-hidden="true" />
        </span>
    );
}

function SourceMeta({ source }: { source: NotebookSource }) {
    const { t } = useTranslation();
    if (isReading(source)) {
        return (
            <span className="flex items-center gap-2 text-[11px] text-text-2" data-testid="study-source-reading">
                <span
                    className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={source.progress}
                    aria-label={t("NotebookStudyReading")}
                >
                    <span className="block h-full bg-accent transition-all" style={{ width: `${Math.max(4, source.progress)}%` }} />
                </span>
                {t("NotebookStudyReadingPercent", { percent: source.progress })}
            </span>
        );
    }
    if (source.status === "FAILED") {
        return (
            <span className="text-[11px] text-danger">
                {source.errorKey ? t(source.errorKey) : t("NotebookStudySourceFailed")}
            </span>
        );
    }
    const parts: string[] = [];
    if (source.kind === "PDF" && source.pageCount) {
        parts.push(t("NotebookStudySourcePages", { count: source.pageCount }));
    } else {
        parts.push(t(source.kind === "LINK" ? "NotebookStudyKindLink" : "NotebookStudyKindText"));
    }
    if (source.inherited && source.pageTitle) {
        parts.push(t("NotebookStudySourceInherited", { page: source.pageTitle }));
    }
    return <span className="truncate text-[11px] text-text-2">{parts.join(" · ")}</span>;
}
