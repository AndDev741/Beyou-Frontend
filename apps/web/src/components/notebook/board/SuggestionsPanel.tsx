import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, X } from "lucide-react";
import type { SuggestedNode } from "@beyou/types/notebook/notebook";
import { suggestNodes } from "@beyou/api/notebook";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import ErrorNotice from "../../ErrorNotice";
import { AiWaitingLine } from "../aiWaiting";

/**
 * "Suggest nodes": the AI proposes, the person keeps or dismisses each one. Nothing reaches the
 * board until "Keep", which goes through the same add-node path as typing a title.
 */
export default function SuggestionsPanel({
    pageId,
    fromSources = false,
    onKeep,
    onClose,
}: {
    pageId: string;
    fromSources?: boolean;
    onKeep: (title: string) => Promise<unknown>;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const [suggestions, setSuggestions] = useState<SuggestedNode[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<ApiErrorPayload | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        const response = await suggestNodes(pageId, fromSources, t);
        setLoading(false);
        if (response.success) setSuggestions(response.success);
        else setError(response.error ?? null);
    };

    const keep = async (s: SuggestedNode) => {
        await onKeep(s.title);
        setSuggestions((list) => (list ?? []).filter((x) => x !== s));
    };

    return (
        <div data-testid="board-suggestions" className="rounded-card border border-border bg-surface p-3 shadow-surface">
            <div className="mb-2 flex items-center gap-2">
                <Sparkles size={15} className="text-accent" aria-hidden="true" />
                <span className="flex-1 text-sm font-semibold text-text">{t("NotebookSuggestTitle")}</span>
                <button type="button" onClick={onClose} aria-label={t("Close")} className="rounded-control p-1 text-text-2 hover:bg-surface-2">
                    <X size={15} aria-hidden="true" />
                </button>
            </div>
            {suggestions === null && !loading && (
                <button type="button" onClick={load} className="w-full rounded-control bg-accent-soft px-3 py-2 text-sm font-semibold text-accent">
                    {t("NotebookSuggestRun")}
                </button>
            )}
            {loading && <p role="status" className="text-sm text-text-2"><AiWaitingLine label={t("NotebookSuggestLoading")} /></p>}
            <ErrorNotice error={error} />
            {suggestions && suggestions.length === 0 && <p className="text-sm text-text-2">{t("NotebookSuggestNone")}</p>}
            <ul className="flex flex-col gap-2">
                {(suggestions ?? []).map((s) => (
                    <li key={s.title} className="rounded-control border border-dashed border-accent/60 bg-accent-soft p-2.5">
                        <p className="text-sm font-semibold text-text">{s.title}</p>
                        {s.why && <p className="mt-0.5 text-xs text-text-2">{s.why}</p>}
                        <div className="mt-2 flex gap-2">
                            <button type="button" onClick={() => keep(s)} data-testid="suggestion-keep"
                                className="rounded-control bg-accent px-3 py-1 text-xs font-semibold text-on-accent">
                                {t("NotebookSuggestKeep")}
                            </button>
                            <button type="button" onClick={() => setSuggestions((l) => (l ?? []).filter((x) => x !== s))}
                                className="rounded-control border border-border px-3 py-1 text-xs font-semibold text-text">
                                {t("NotebookSuggestDismiss")}
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
