import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Search, X } from "lucide-react";
import type { PageSearchHit } from "@beyou/types/notebook/notebook";
import { searchPages } from "@beyou/api/notebook";
import Modal from "../../modals/Modal";

/** Searching starts at two letters, like the board's link picker; one letter matches everything. */
const MIN_QUERY = 2;
const SEARCH_DELAY_MS = 250;

/**
 * "Save to notebook" for a diagram the assistant showed: find the page it should go into. The
 * caller appends it once a page is picked; `busy` holds the list while that runs.
 */
export default function DiagramPagePicker({ isOpen, onClose, onPick, busy = false }: {
    isOpen: boolean;
    onClose: () => void;
    onPick: (hit: PageSearchHit) => void;
    busy?: boolean;
}) {
    const { t } = useTranslation();
    const titleId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState("");
    const [hits, setHits] = useState<PageSearchHit[]>([]);
    const [searched, setSearched] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setQuery("");
        setHits([]);
        setSearched(false);
        inputRef.current?.focus();
    }, [isOpen]);

    useEffect(() => {
        const q = query.trim();
        if (q.length < MIN_QUERY) {
            setHits([]);
            setSearched(false);
            return;
        }
        let live = true;
        const id = setTimeout(async () => {
            const response = await searchPages(q, t);
            if (!live) return;
            setHits(response.success ?? []);
            setSearched(true);
        }, SEARCH_DELAY_MS);
        return () => {
            live = false;
            clearTimeout(id);
        };
    }, [query, t]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} labelledBy={titleId} className="!max-w-md">
            <div data-testid="diagram-page-picker" className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                    <h2 id={titleId} className="text-lg font-semibold text-text">{t("DiagramPickPage")}</h2>
                    <button type="button" onClick={onClose} aria-label={t("Close")}
                        className="flex h-9 w-9 items-center justify-center rounded-control text-text-2 hover:bg-surface-2 hover:text-text">
                        <X size={17} aria-hidden="true" />
                    </button>
                </div>
                <label className="flex items-center gap-2 rounded-control border border-border bg-surface px-3 focus-within:border-accent">
                    <Search size={15} className="text-text-3" aria-hidden="true" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t("DiagramPickPageSearch")}
                        aria-label={t("DiagramPickPageSearch")}
                        data-testid="diagram-page-search"
                        className="h-10 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-3"
                    />
                </label>
                {searched && hits.length === 0 && (
                    <p className="px-1 text-sm text-text-2" role="status">{t("DiagramPickPageEmpty")}</p>
                )}
                {hits.length > 0 && (
                    <ul className="flex max-h-72 flex-col overflow-y-auto" aria-busy={busy}>
                        {hits.map((hit) => (
                            <li key={hit.id}>
                                <button type="button" onClick={() => onPick(hit)} disabled={busy} data-testid="diagram-page-option"
                                    className="flex w-full items-center gap-2.5 rounded-control px-2 py-2 text-left hover:bg-surface-2 disabled:opacity-60">
                                    <FileText size={15} className="shrink-0 text-text-3" aria-hidden="true" />
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
                )}
            </div>
        </Modal>
    );
}
