import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link2, Search } from "lucide-react";
import type { PageSearchHit } from "@beyou/types/notebook/notebook";
import { searchPages } from "@beyou/api/notebook";

/**
 * Finds a page to show on this board through a link. The page keeps its home and its progress;
 * the board only points at it.
 */
export default function LinkPagePicker({ excludeIds, onPick }: { excludeIds: Set<string>; onPick: (id: string) => void }) {
    const { t } = useTranslation();
    const [query, setQuery] = useState("");
    const [hits, setHits] = useState<PageSearchHit[]>([]);

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            setHits([]);
            return;
        }
        const id = setTimeout(async () => {
            const response = await searchPages(q, t);
            if (response.success) setHits(response.success.filter((h) => !excludeIds.has(h.id)));
        }, 250);
        return () => clearTimeout(id);
    }, [query, t, excludeIds]);

    return (
        <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 rounded-control border border-border bg-surface px-3">
                <Search size={14} className="text-text-3" aria-hidden="true" />
                <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("NotebookLinkSearch")}
                    aria-label={t("NotebookLinkSearch")}
                    className="h-9 flex-1 bg-transparent text-sm text-text outline-none"
                />
            </label>
            <ul className="max-h-60 overflow-y-auto">
                {hits.map((hit) => (
                    <li key={hit.id}>
                        <button type="button" onClick={() => onPick(hit.id)}
                            className="flex w-full items-center gap-2 rounded-control px-2 py-2 text-left hover:bg-surface-2">
                            <Link2 size={14} className="text-text-3" aria-hidden="true" />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-text">{hit.title}</span>
                                {hit.topicTitle && hit.kind === "PAGE" && (
                                    <span className="block truncate text-xs text-text-2">{hit.topicTitle}</span>
                                )}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
