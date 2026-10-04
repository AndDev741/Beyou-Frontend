import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Sparkles, X } from "lucide-react";
import type { Answer, Citation } from "@beyou/types/notebook/notebook";
import { appendToPage, explainText } from "@beyou/api/notebook";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import NotebookMarkdown from "./NotebookMarkdown";
import CitationPanel from "./CitationPanel";
import ErrorNotice from "../ErrorNotice";

/**
 * "Explain the block above": the AI's explanation of a passage of the person's notes, citing the
 * page and its sources where they back it up. "Add to page" appends it as blocks.
 */
export default function ExplainPanel({
    pageId,
    text,
    onClose,
    onAppended,
}: {
    pageId: string;
    text: string;
    onClose: () => void;
    onAppended: () => void;
}) {
    const { t } = useTranslation();
    const [answer, setAnswer] = useState<Answer | null>(null);
    const [error, setError] = useState<ApiErrorPayload | null>(null);
    const [citation, setCitation] = useState<Citation | null>(null);

    useEffect(() => {
        let live = true;
        setAnswer(null);
        setError(null);
        void explainText(pageId, text, t).then((response) => {
            if (!live) return;
            if (response.success) setAnswer(response.success);
            else setError(response.error ?? null);
        });
        return () => {
            live = false;
        };
    }, [pageId, text, t]);

    const append = async () => {
        if (!answer) return;
        const response = await appendToPage(pageId, answer.markdown, t);
        if (response.success) {
            toast.success(t("NotebookSavedToPage"));
            onAppended();
        }
    };

    return (
        <aside data-testid="explain-panel" className="mt-4 rounded-card border border-border bg-surface p-4">
            <div className="mb-2 flex items-center gap-2">
                <Sparkles size={15} className="text-accent" aria-hidden="true" />
                <span className="flex-1 text-sm font-semibold text-text">{t("NotebookExplainTitle")}</span>
                <button type="button" onClick={onClose} aria-label={t("Close")} className="rounded-lg p-1 text-text-2 hover:bg-surface-2">
                    <X size={15} aria-hidden="true" />
                </button>
            </div>
            <blockquote className="mb-3 border-0 bg-surface-2 p-2 text-[13px] text-text-2 rounded-control line-clamp-3">{text}</blockquote>
            {!answer && !error && <p className="text-sm text-text-2">{t("NotebookThinking")}</p>}
            <ErrorNotice error={error} />
            {answer && (
                <>
                    <NotebookMarkdown markdown={answer.markdown} citations={answer.citations} onCitation={setCitation} />
                    {citation && <div className="mt-3"><CitationPanel citation={citation} onClose={() => setCitation(null)} /></div>}
                    <button type="button" onClick={append} className="mt-3 rounded-control border border-border px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface-2">
                        {t("NotebookAddToPage")}
                    </button>
                </>
            )}
        </aside>
    );
}
