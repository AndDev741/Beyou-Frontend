import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Flame, Layers, X } from "lucide-react";
import { finishReview, getDueCards, reviewCard } from "@beyou/api/notebook";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import type { CardRating, FinishReview } from "@beyou/types/notebook/notebook";
import { afterAnswer, position, startSession, type ReviewSession } from "@beyou/state/notebook/reviewQueue";
import type { RefreshUI } from "@beyou/types/refreshUi/refreshUi.type";
import useUiRefresh from "../../hooks/useUiRefresh";
import ErrorNotice from "../../components/ErrorNotice";

const RATINGS: { value: CardRating; key: string; primary?: boolean }[] = [
    { value: "AGAIN", key: "NotebookRateAgain" },
    { value: "HARD", key: "NotebookRateHard" },
    { value: "GOOD", key: "NotebookRateGood", primary: true },
    { value: "EASY", key: "NotebookRateEasy" },
];

/**
 * A review session: today's due cards, one at a time. Say the answer, show it, rate how it went.
 *
 * AGAIN puts the card back at the end of this session (the server has it due today again), so a
 * session ends when every card has been remembered once. Finishing pays the session's XP in one
 * go; leaving early still pays for what was reviewed, because the reviews are already stored and
 * the next finish today collects them.
 *
 * Keys: Space shows the answer, 1 to 4 rate.
 */
export default function NotebookReview() {
    const { t } = useTranslation();
    const [params] = useSearchParams();
    const scope = params.get("page");
    // The queue's rules (AGAIN goes to the back, the header never counts a card twice) live in
    // @beyou/state, shared with the mobile review screen.
    const [session, setSession] = useState<ReviewSession | null>(null);
    const [shown, setShown] = useState(false);
    const [busy, setBusy] = useState(false);
    const [summary, setSummary] = useState<FinishReview | null>(null);
    const [error, setError] = useState<ApiErrorPayload | null>(null);
    const [refreshUi, setRefreshUi] = useState<RefreshUI>({});
    useUiRefresh(refreshUi);

    useEffect(() => {
        void getDueCards(scope, t).then((response) => {
            if (response.success) {
                setSession(startSession(response.success.cards));
            } else {
                setError(response.error ?? null);
            }
        });
    }, [scope, t]);

    const finish = useCallback(async () => {
        const response = await finishReview(t);
        if (response.success) {
            setSummary(response.success);
            if (response.success.refreshUi) setRefreshUi(response.success.refreshUi);
        }
    }, [t]);

    const rate = useCallback(
        async (rating: CardRating) => {
            if (!session || session.queue.length === 0 || busy) return;
            const card = session.queue[0];
            setBusy(true);
            const response = await reviewCard(card.id, rating, t);
            setBusy(false);
            if (!response.success) {
                setError(response.error ?? null);
                return;
            }
            setShown(false);
            const next = afterAnswer(session, response.success);
            setSession(next);
            if (next.queue.length === 0) void finish();
        },
        [session, busy, t, finish]
    );

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (summary || !session?.queue.length) return;
            if (event.key === " " && !shown) {
                event.preventDefault();
                setShown(true);
            } else if (shown && ["1", "2", "3", "4"].includes(event.key)) {
                void rate(RATINGS[Number(event.key) - 1].value);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [shown, session, summary, rate]);

    const queue = session?.queue;
    const card = queue?.[0];
    const total = session?.total ?? 0;
    const done = session?.answered ?? 0;

    return (
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl flex-col gap-5 bg-bg px-4 py-6 text-text" data-testid="notebook-review">
            <header className="flex items-center gap-3">
                <Link to={scope ? `/notebook/${scope}` : "/notebook"} aria-label={t("NotebookReviewClose")}
                    className="flex h-10 w-10 items-center justify-center rounded-control text-text hover:bg-surface-2">
                    <X size={20} aria-hidden="true" />
                </Link>
                <h1 className="flex-1 text-lg font-semibold">{t("NotebookReview")}</h1>
                {session && <span className="font-mono text-sm text-text-2">{position(session)} / {total}</span>}
            </header>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full bg-accent transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
            </div>
            <ErrorNotice error={error} />

            {summary ? (
                <section className="flex flex-col items-center gap-3 rounded-[24px] border border-border bg-surface p-8 text-center" data-testid="review-summary">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-xp-soft text-xp"><Layers size={24} aria-hidden="true" /></span>
                    <h2 className="text-xl font-semibold">{t("NotebookReviewDoneTitle")}</h2>
                    <p className="text-sm text-text-2">{t("NotebookReviewDoneText", { count: session?.reviewed ?? 0 })}</p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {summary.xpEarned > 0 && (
                            <span className="inline-flex h-7 items-center rounded-full bg-xp-soft px-3 font-mono text-sm font-semibold text-xp">+{summary.xpEarned} XP</span>
                        )}
                        {summary.streak > 0 && (
                            <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-flame-soft px-3 text-sm font-semibold text-flame">
                                <Flame size={14} aria-hidden="true" />{t("NotebookReviewStreak", { count: summary.streak })}
                            </span>
                        )}
                    </div>
                    <Link to={scope ? `/notebook/${scope}` : "/notebook"} className="mt-2 rounded-control bg-accent px-4 py-2 text-sm font-semibold text-on-accent">
                        {t("NotebookReviewBack")}
                    </Link>
                </section>
            ) : queue && queue.length === 0 ? (
                <section className="rounded-[24px] border border-border bg-surface p-8 text-center" data-testid="review-empty">
                    <p className="text-base font-semibold">{t("NotebookReviewNothing")}</p>
                    <p className="mt-1 text-sm text-text-2">{t("NotebookReviewNothingText")}</p>
                </section>
            ) : card ? (
                <>
                    <section className="flex min-h-[320px] flex-col gap-4 rounded-[24px] border border-border bg-surface p-6 shadow-surface" data-testid="review-card">
                        <div className="flex flex-wrap gap-1.5">
                            {card.pageTitle && <span className="inline-flex h-6 items-center rounded-full bg-accent-soft px-2.5 text-xs font-semibold text-accent">{card.pageTitle}</span>}
                            {card.topicTitle && <span className="inline-flex h-6 items-center rounded-full bg-surface-2 px-2.5 text-xs font-semibold text-text-2">{card.topicTitle}</span>}
                        </div>
                        <p className="whitespace-pre-line text-xl font-semibold leading-7 tracking-[-0.01em]">{card.front}</p>
                        {shown ? (
                            <>
                                <div className="h-px bg-border" />
                                <p className="whitespace-pre-line text-[17px] leading-[26px]" data-testid="review-answer">{card.back}</p>
                                {card.sourceLabel && <p className="mt-auto text-xs text-text-2">{t("NotebookReviewFrom", { source: card.sourceLabel })}</p>}
                            </>
                        ) : (
                            <p className="mt-auto text-[13px] text-text-2">{t("NotebookReviewSayItFirst")}</p>
                        )}
                    </section>
                    {shown ? (
                        <div role="group" aria-label={t("NotebookReviewHowWell")} className="grid grid-cols-4 gap-2">
                            {RATINGS.map((r, i) => (
                                <button key={r.value} type="button" onClick={() => void rate(r.value)} disabled={busy}
                                    data-testid={`review-rate-${r.value}`}
                                    className={`flex h-[60px] flex-col items-center justify-center gap-0.5 rounded-[14px] disabled:opacity-60 ${
                                        r.primary ? "bg-accent text-on-accent" : "border border-border bg-surface text-text"
                                    }`}>
                                    <span className="text-sm font-semibold">{t(r.key)}</span>
                                    <span className={`font-mono text-[11px] ${r.primary ? "" : "text-text-2"}`}>
                                        {card.intervals[r.value] === 0 ? t("NotebookIntervalToday") : t("NotebookIntervalDays", { count: card.intervals[r.value] })}
                                    </span>
                                    <span className="sr-only">{i + 1}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <button type="button" onClick={() => setShown(true)} data-testid="review-show"
                            className="h-14 rounded-[14px] bg-text text-base font-semibold text-surface">
                            {t("NotebookReviewShow")}
                        </button>
                    )}
                    <p className="text-center text-xs text-text-2">{t("NotebookReviewKeys")}</p>
                </>
            ) : (
                !error && <p className="text-sm text-text-2">{t("NotebookLoading")}</p>
            )}
        </div>
    );
}
