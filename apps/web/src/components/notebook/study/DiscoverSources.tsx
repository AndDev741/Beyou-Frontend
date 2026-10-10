import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, Search } from "lucide-react";
import { toast } from "react-toastify";
import { addLinkSource, discoverSources } from "@beyou/api/notebook";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import type { DiscoveryResult, NotebookSource } from "@beyou/types/notebook/notebook";
import AiPrivacyNotice from "../../agent/AiPrivacyNotice";
import ErrorNotice from "../../ErrorNotice";
import { AiWaitingLine } from "../aiWaiting";

/**
 * "Find sources for me": describe what the sources should cover, see what the web search found,
 * tick the ones to keep, and add them as link sources.
 *
 * Everything offered was opened on the server first, so it loads, it is public, and the page
 * does not have it yet. Results start ticked; adding is one link source each, read in the
 * background like any link the person pastes.
 */
export default function DiscoverSources({ pageId, onAdded, autoFocus }: {
    pageId: string;
    onAdded: (source: NotebookSource) => void;
    autoFocus?: boolean;
}) {
    const { t } = useTranslation();
    const [description, setDescription] = useState("");
    const [searching, setSearching] = useState(false);
    const [result, setResult] = useState<DiscoveryResult | null>(null);
    const [picked, setPicked] = useState<Set<string>>(new Set());
    const [adding, setAdding] = useState(false);
    const [added, setAdded] = useState<number | null>(null);
    const [error, setError] = useState<ApiErrorPayload | null>(null);

    const find = async () => {
        if (!description.trim() || searching) return;
        setSearching(true);
        setError(null);
        setAdded(null);
        setResult(null);
        const response = await discoverSources(pageId, description.trim(), t);
        setSearching(false);
        if (!response.success) {
            setError(response.error ?? null);
            return;
        }
        setResult(response.success);
        setPicked(new Set(response.success.sources.map((s) => s.url)));
    };

    const toggle = (url: string) =>
        setPicked((current) => {
            const next = new Set(current);
            if (next.has(url)) next.delete(url);
            else next.add(url);
            return next;
        });

    const add = async () => {
        if (!result || picked.size === 0) return;
        setAdding(true);
        let count = 0;
        let failed = 0;
        for (const source of result.sources.filter((s) => picked.has(s.url))) {
            const response = await addLinkSource(pageId, source.url, t);
            if (response.success) {
                count++;
                onAdded(response.success);
            } else {
                failed++;
            }
        }
        setAdding(false);
        if (failed > 0) toast.error(t("NotebookDiscoverSomeFailed", { count: failed }));
        setAdded(count);
        setResult(null);
        setPicked(new Set());
    };

    return (
        <div className="flex flex-col gap-3" data-testid="discover-sources">
            <form
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    void find();
                }}
            >
                <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-text">
                    {t("NotebookDiscoverWhat")}
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={500}
                        rows={2}
                        autoFocus={autoFocus}
                        placeholder={t("NotebookDiscoverPlaceholder")}
                        data-testid="discover-description"
                        className="resize-none rounded-control border border-border bg-surface p-3 text-sm font-normal text-text outline-none focus:border-accent"
                    />
                </label>
                <button
                    type="submit"
                    disabled={!description.trim() || searching || adding}
                    data-testid="discover-find"
                    className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-control bg-accent-soft px-3.5 text-[13px] font-semibold text-accent disabled:opacity-60"
                >
                    <Search size={14} aria-hidden="true" />
                    {result ? t("NotebookDiscoverAgain") : t("NotebookDiscoverFind")}
                </button>
                <AiPrivacyNotice messageKey="NotebookDiscoverPrivacyNotice" testId="discover-privacy-notice" />
            </form>

            {searching && (
                <p role="status" className="text-sm text-text-2">
                    <AiWaitingLine label={t("NotebookDiscoverSearching")} />
                </p>
            )}
            <ErrorNotice error={error} />
            {added !== null && (
                <p role="status" className="text-[13px] text-text-2" data-testid="discover-added">
                    {t("NotebookDiscoverAdded", { count: added })}
                </p>
            )}

            {result && result.sources.length === 0 && (
                <p className="text-[13px] text-text-2" data-testid="discover-none">{t("NotebookDiscoverNone")}</p>
            )}
            {result && result.sources.length > 0 && (
                <>
                    <ul className="flex flex-col gap-1.5">
                        {result.sources.map((source) => (
                            <li key={source.url} data-testid="discover-result"
                                className="flex items-start gap-2.5 rounded-control border border-border bg-surface p-2.5">
                                <input
                                    type="checkbox"
                                    checked={picked.has(source.url)}
                                    onChange={() => toggle(source.url)}
                                    aria-label={t("NotebookDiscoverPick", { title: source.title })}
                                    className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
                                />
                                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                    <span className="flex min-w-0 items-center gap-1.5">
                                        <span className="truncate text-[13px] font-semibold text-text" title={source.title}>{source.title}</span>
                                        <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={t("NotebookDiscoverOpen", { title: source.title })}
                                            className="shrink-0 text-text-3 hover:text-accent">
                                            <ExternalLink size={12} aria-hidden="true" />
                                        </a>
                                    </span>
                                    <span className="text-[11px] text-text-2">{source.domain}</span>
                                    {source.summary && <span className="text-xs leading-[18px] text-text-2">{source.summary}</span>}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <button
                        type="button"
                        onClick={() => void add()}
                        disabled={picked.size === 0 || adding}
                        data-testid="discover-add"
                        className="inline-flex h-9 items-center justify-center self-start rounded-control bg-accent px-3.5 text-[13px] font-semibold text-on-accent disabled:opacity-60"
                    >
                        {adding ? t("NotebookDiscoverAdding") : t("NotebookDiscoverAdd", { count: picked.size })}
                    </button>
                </>
            )}
        </div>
    );
}
