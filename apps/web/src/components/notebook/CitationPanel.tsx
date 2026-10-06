import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import type { Citation, Passage } from "@beyou/types/notebook/notebook";
import { getPassage } from "@beyou/api/notebook";

/**
 * What a citation points at. A page citation links to the page; a source citation shows the
 * excerpt at once and loads the passage with the text either side of it on request.
 */
export default function CitationPanel({ citation, onClose }: { citation: Citation; onClose: () => void }) {
    const { t } = useTranslation();
    const [passage, setPassage] = useState<Passage | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => setPassage(null), [citation]);

    const openPassage = async () => {
        if (!citation.sourceId || !citation.chunkId) return;
        setLoading(true);
        const response = await getPassage(citation.sourceId, citation.chunkId, t);
        setLoading(false);
        if (response.success) setPassage(response.success);
    };

    return (
        <div
            role="dialog"
            aria-label={t("NotebookCitationTitle", { n: citation.n })}
            data-testid="citation-panel"
            className="rounded-card border border-border bg-surface p-4 shadow-surface"
        >
            <div className="flex items-start gap-2">
                <span className="rounded-md bg-accent-soft px-1.5 font-mono text-[11px] font-semibold leading-5 text-accent">
                    {citation.n}
                </span>
                <p className="flex-1 text-sm font-semibold text-text">{citation.title}</p>
                <button type="button" onClick={onClose} aria-label={t("Close")} className="rounded-control p-1 text-text-2 hover:bg-surface-2">
                    <X size={16} aria-hidden="true" />
                </button>
            </div>
            {passage ? (
                <div className="mt-3 max-h-72 space-y-2 overflow-y-auto text-sm leading-6 text-text-2">
                    {passage.before && <p className="opacity-70">{passage.before}</p>}
                    <p className="rounded-control bg-accent-soft p-2 text-text">{passage.text}</p>
                    {passage.after && <p className="opacity-70">{passage.after}</p>}
                </div>
            ) : (
                <p className="mt-3 text-sm leading-6 text-text-2">{citation.excerpt}</p>
            )}
            <div className="mt-3">
                {citation.kind === "PAGE" && citation.pageId ? (
                    <Link to={`/notebook/${citation.pageId}`} className="text-sm font-semibold text-accent">
                        {t("NotebookCitationOpenPage")}
                    </Link>
                ) : (
                    !passage && (
                        <button type="button" onClick={openPassage} disabled={loading} className="text-sm font-semibold text-accent disabled:opacity-60">
                            {citation.pageNumber
                                ? t("NotebookCitationOpenAtPage", { page: citation.pageNumber })
                                : t("NotebookCitationOpenPassage")}
                        </button>
                    )
                )}
            </div>
        </div>
    );
}
