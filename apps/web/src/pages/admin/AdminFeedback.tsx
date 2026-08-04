import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import listFeedbackAdminItems from "@beyou/api/feedback/listFeedbackAdminItems";
import getFeedbackAdminCounts from "@beyou/api/feedback/getFeedbackAdminCounts";
import type {
    FeedbackAdminItem,
    FeedbackCategory,
    FeedbackCounts,
    FeedbackStatus
} from "@beyou/api/feedback/feedbackTypes";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import useAuthGuard from "../../components/useAuthGuard";
import ErrorNotice from "../../components/ErrorNotice";
import AdminFeedbackDetail from "./AdminFeedbackDetail";
// Category labels are shared with the submitter-side form on purpose: two maps
// would drift, and the console must read the same words the user chose from.
import { FEEDBACK_CATEGORY_LABEL_KEYS } from "../feedback/feedbackMailto";
import {
    FEEDBACK_CATEGORY_ORDER,
    FEEDBACK_STATUS_BADGE_CLASSES,
    FEEDBACK_STATUS_LABEL_KEYS,
    FEEDBACK_STATUS_ORDER,
    formatFeedbackTimestamp
} from "./feedbackAdminLabels";

import PageHeader from "../../ui/PageHeader";
const PAGE_SIZE = 20;

/** `""` is "no filter", which the client omits from the query entirely. */
const NO_FILTER = "" as const;

type CountTile = {
    key: keyof FeedbackCounts;
    labelKey: string;
};

const COUNT_TILES: CountTile[] = [
    { key: "open", labelKey: "AdminFeedbackStatusOpen" },
    { key: "takingCare", labelKey: "AdminFeedbackStatusTakingCare" },
    { key: "closed", labelKey: "AdminFeedbackStatusClosed" },
    { key: "total", labelKey: "AdminFeedbackCountTotal" }
];

const FILTER_CONTROL_CLASSES =
    "rounded-card border-2 border-border bg-bg p-2 text-text focus:outline-none focus:ring-2 focus:ring-accent";

/**
 * The single feedback inbox (KD5): read, filter, re-status and reply, all here.
 * Reachable only through `AdminRoute`; every read below is ROLE_ADMIN-gated
 * server-side, which is what actually keeps it private.
 */
function AdminFeedback() {
    useAuthGuard();
    const { t, i18n } = useTranslation();

    const [statusFilter, setStatusFilter] = useState<FeedbackStatus | typeof NO_FILTER>(NO_FILTER);
    const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory | typeof NO_FILTER>(NO_FILTER);
    const [page, setPage] = useState(0);

    const [items, setItems] = useState<FeedbackAdminItem[]>([]);
    const [totalPages, setTotalPages] = useState(0);
    const [counts, setCounts] = useState<FeedbackCounts | null>(null);
    const [listError, setListError] = useState<ApiErrorPayload | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    /** Monotonic id of the newest list request; older answers are discarded. */
    const listRequestRef = useRef(0);

    const loadCounts = useCallback(async () => {
        // R12: the tiles describe the whole inbox. Counting the loaded page would
        // report "3 open" when 3 of 40 happen to be on screen, so the counters
        // come from the dedicated unfiltered endpoint and are refetched whenever
        // a status change makes them stale.
        const result = await getFeedbackAdminCounts(t);
        if (result.success) setCounts(result.success);
    }, [t]);

    const loadItems = useCallback(async () => {
        const requestId = listRequestRef.current + 1;
        listRequestRef.current = requestId;

        setIsLoading(true);
        const result = await listFeedbackAdminItems(
            {
                ...(statusFilter ? { status: statusFilter } : {}),
                ...(categoryFilter ? { category: categoryFilter } : {}),
                page,
                size: PAGE_SIZE
            },
            t
        );

        // Nothing cancels an abandoned list call, so toggling a filter twice in
        // quick succession leaves two in flight and the network decides which
        // answers last. A stale answer landing last would repaint the list for a
        // filter nobody has selected, with `isLoading` already false — no error,
        // no spinner, just the wrong rows.
        if (requestId !== listRequestRef.current) return;

        setIsLoading(false);
        if (!result.success) {
            setItems([]);
            setTotalPages(0);
            setListError(result.error ?? { message: t("UnexpectedError") });
            return;
        }

        setListError(null);
        setItems(result.success.items ?? []);
        setTotalPages(result.success.totalPages ?? 0);
    }, [statusFilter, categoryFilter, page, t]);

    useEffect(() => {
        void loadItems();
    }, [loadItems]);

    useEffect(() => {
        void loadCounts();
    }, [loadCounts]);

    const onStatusChanged = useCallback(
        (updated: FeedbackAdminItem) => {
            // Immediate feedback on the row the admin just acted on...
            setItems((current) =>
                current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
            );
            // ...then re-read both views from the server. Refetching only the
            // counters is what made the tiles and the list disagree: in the
            // primary workflow — filter to Open, close items one by one — every
            // closed item stayed in the Open list wearing a Closed badge, and
            // only the tiles told the truth. Membership of a filtered set is the
            // server's answer to give, not something a local patch can decide.
            void loadItems();
            void loadCounts();
        },
        [loadItems, loadCounts]
    );

    // A filter change invalidates the page cursor: page 3 of the old result set
    // is meaningless in the new one.
    const onStatusFilterChanged = (value: string) => {
        setSelectedId(null);
        setPage(0);
        setStatusFilter(value as FeedbackStatus | typeof NO_FILTER);
    };

    const onCategoryFilterChanged = (value: string) => {
        setSelectedId(null);
        setPage(0);
        setCategoryFilter(value as FeedbackCategory | typeof NO_FILTER);
    };

    return (
        <div className="min-h-[calc(100vh-5rem)] lg:min-h-[calc(100vh-6rem)] w-full bg-bg px-3 py-5 text-text lg:px-7 lg:py-6">
            <PageHeader title={t("AdminFeedbackPageTitle")} />

            <div className="flex w-full flex-col gap-5">
                <p className="text-sm text-text-2">{t("AdminFeedbackIntro")}</p>

                <dl
                    data-testid="admin-feedback-counts"
                    className="grid grid-cols-2 gap-3 md:grid-cols-4"
                >
                    {COUNT_TILES.map(({ key, labelKey }) => (
                        <div
                            key={key}
                            className="rounded-control border border-border bg-surface px-3 py-2.5"
                        >
                            <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
                                {t(labelKey)}
                            </dt>
                            <dd
                                data-testid={`admin-feedback-count-${key}`}
                                className="mt-0.5 font-mono text-lg font-semibold text-text"
                            >
                                {counts?.[key] ?? "—"}
                            </dd>
                        </div>
                    ))}
                </dl>

                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="admin-feedback-status-filter" className="text-sm text-text-2">
                            {t("AdminFeedbackFilterStatus")}
                        </label>
                        <select
                            id="admin-feedback-status-filter"
                            data-testid="admin-feedback-filter-status"
                            value={statusFilter}
                            onChange={(event) => onStatusFilterChanged(event.target.value)}
                            className={FILTER_CONTROL_CLASSES}
                        >
                            <option value={NO_FILTER}>{t("AdminFeedbackFilterAll")}</option>
                            {FEEDBACK_STATUS_ORDER.map((status) => (
                                <option key={status} value={status}>
                                    {t(FEEDBACK_STATUS_LABEL_KEYS[status])}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="admin-feedback-category-filter" className="text-sm text-text-2">
                            {t("AdminFeedbackFilterCategory")}
                        </label>
                        <select
                            id="admin-feedback-category-filter"
                            data-testid="admin-feedback-filter-category"
                            value={categoryFilter}
                            onChange={(event) => onCategoryFilterChanged(event.target.value)}
                            className={FILTER_CONTROL_CLASSES}
                        >
                            <option value={NO_FILTER}>{t("AdminFeedbackFilterAll")}</option>
                            {FEEDBACK_CATEGORY_ORDER.map((category) => (
                                <option key={category} value={category}>
                                    {t(FEEDBACK_CATEGORY_LABEL_KEYS[category])}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {listError && (
                    <div data-testid="admin-feedback-error" role="alert">
                        <ErrorNotice error={listError} canReport={false} />
                    </div>
                )}

                {isLoading && <p className="text-sm text-text-2">{t("AdminFeedbackLoading")}</p>}

                {!isLoading && !listError && items.length === 0 && (
                    <p className="text-sm text-text-2">{t("AdminFeedbackEmpty")}</p>
                )}

                {items.length > 0 && (
                    <ul className="flex flex-col gap-3">
                        {items.map((item) => {
                            const status = item.status ?? "OPEN";
                            const isSelected = item.id === selectedId;
                            return (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        data-testid={`admin-feedback-row-${item.id}`}
                                        aria-pressed={isSelected}
                                        onClick={() => setSelectedId(item.id ?? null)}
                                        className={`flex w-full flex-col gap-2 rounded-card border-2 p-3 text-left transition-colors duration-200 ${
                                            isSelected
                                                ? "border-accent bg-accent/5"
                                                : "border-border hover:border-border"
                                        }`}
                                    >
                                        <span className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${FEEDBACK_STATUS_BADGE_CLASSES[status]}`}
                                            >
                                                {t(FEEDBACK_STATUS_LABEL_KEYS[status])}
                                            </span>
                                            {item.category && (
                                                <span className="rounded-full border border-border/30 px-2 py-0.5 text-xs text-text">
                                                    {t(FEEDBACK_CATEGORY_LABEL_KEYS[item.category])}
                                                </span>
                                            )}
                                            <span className="text-xs text-text-2">
                                                {formatFeedbackTimestamp(item.createdAt, i18n.language)}
                                            </span>
                                        </span>
                                        <span className="line-clamp-2 text-text">{item.body}</span>
                                        <span className="flex flex-wrap gap-2 text-xs text-text-2">
                                            <span>{item.submitter?.name}</span>
                                            <span>{item.submitter?.email}</span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            data-testid="admin-feedback-prev-page"
                            disabled={page === 0}
                            onClick={() => setPage((current) => Math.max(0, current - 1))}
                            className="rounded-[20px] border border-border px-4 py-2 text-sm font-semibold text-accent transition-colors duration-200 hover:bg-accent hover:text-on-accent disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-accent"
                        >
                            {t("AdminFeedbackPrevPage")}
                        </button>
                        <span className="text-sm text-text-2">
                            {t("AdminFeedbackPagePosition", { page: page + 1, total: totalPages })}
                        </span>
                        <button
                            type="button"
                            data-testid="admin-feedback-next-page"
                            disabled={page + 1 >= totalPages}
                            onClick={() => setPage((current) => current + 1)}
                            className="rounded-[20px] border border-border px-4 py-2 text-sm font-semibold text-accent transition-colors duration-200 hover:bg-accent hover:text-on-accent disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-accent"
                        >
                            {t("AdminFeedbackNextPage")}
                        </button>
                    </div>
                )}

                {selectedId && (
                    // Deliberately NOT keyed per submission. A `key` would also
                    // stop one row's response landing on another — by throwing
                    // the instance away — but it would do so by making the
                    // panel's own request-identity guard unreachable, leaving
                    // the correctness of a mutation dependent on a prop in a
                    // different file. The guard is where the check belongs, and
                    // it is what the test exercises.
                    <AdminFeedbackDetail
                        feedbackId={selectedId}
                        onStatusChanged={onStatusChanged}
                        onClose={() => setSelectedId(null)}
                    />
                )}
            </div>
        </div>
    );
}

export default AdminFeedback;
