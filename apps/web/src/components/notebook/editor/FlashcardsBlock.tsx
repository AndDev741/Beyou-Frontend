import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { ChevronRight, Layers, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import type { Flashcard } from "@beyou/types/notebook/notebook";
import { MAX_CARD_SIDE_LENGTH } from "@beyou/types/notebook/notebook";
import { createCard, deleteCard, generateCards, getPageCards, updateCard } from "@beyou/api/notebook";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import useTodayInZone from "../../../hooks/useTodayInZone";
import AiPrivacyNotice from "../../agent/AiPrivacyNotice";
import { AiWaitingLine } from "../aiWaiting";

/** Cards listed before "Show all": enough to see what the deck is about without burying the notes. */
const VISIBLE_CARDS = 3;

/**
 * A page's flashcards as a block: the deck, a form to write one, and "Draft with AI", which reads
 * the page (and its sources) and saves the cards it writes. Reviewing happens in the review
 * session, which the block links to when anything is due.
 *
 * The deck sits among the notes, so it stays small: each card shows its question, and the answer
 * opens under it on a click, the way a card is read. Only the first few are listed until the
 * person asks for the rest.
 */
export default function FlashcardsBlock({ pageId, cardsTotal }: {
    pageId: string;
    /** The page's count as the store has it. The assistant drafts cards from the chat, and when a
     * refresh brings a new count the deck is read again. */
    cardsTotal: number;
}) {
    const { t } = useTranslation();
    const [cards, setCards] = useState<Flashcard[]>([]);
    const [front, setFront] = useState("");
    const [back, setBack] = useState("");
    const [editing, setEditing] = useState<string | null>(null);
    const [drafting, setDrafting] = useState(false);
    const [open, setOpen] = useState(false);
    const [revealed, setRevealed] = useState<Set<string>>(new Set());
    const [showAll, setShowAll] = useState(false);
    // The owner's day, the same one the server files due dates under.
    const today = useTodayInZone();

    const load = useCallback(async () => {
        const response = await getPageCards(pageId, t);
        if (response.success) setCards(response.success);
    }, [pageId, t]);

    useEffect(() => {
        void load();
    }, [load, cardsTotal]);

    const due = cards.filter((c) => c.dueOn <= today).length;
    const visible = showAll ? cards : cards.slice(0, VISIBLE_CARDS);

    const reveal = (id: string) =>
        setRevealed((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const save = async () => {
        if (!front.trim() || !back.trim()) return;
        const response = editing
            ? await updateCard(editing, { front, back }, t)
            : await createCard(pageId, { front, back }, t);
        if (!response.success) {
            toast.error(getFriendlyErrorMessage(t, response.error));
            return;
        }
        setFront("");
        setBack("");
        setEditing(null);
        await load();
    };

    const draft = async () => {
        setDrafting(true);
        const response = await generateCards(pageId, { count: 5 }, t);
        setDrafting(false);
        if (!response.success) {
            toast.error(getFriendlyErrorMessage(t, response.error));
            return;
        }
        toast.success(t("NotebookCardsDrafted", { count: response.success.length }));
        await load();
    };

    return (
        <section
            data-testid="flashcards-block"
            contentEditable={false}
            onKeyDown={(e) => e.stopPropagation()}
            onPaste={(e) => e.stopPropagation()}
            className="my-1 w-full overflow-hidden rounded-[14px] border border-border bg-surface"
        >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-3 py-2">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-xp/10 text-xp">
                    <Layers size={13} aria-hidden="true" />
                </span>
                <span className="text-[13px] font-semibold text-text">{t("NotebookCardsTitle")}</span>
                <span className="text-xs text-text-2">{t("NotebookCardsCount", { count: cards.length, due })}</span>
                <span className="flex-1" />
                {due > 0 && (
                    <Link to={`/notebook/review?page=${pageId}`}
                        className="inline-flex h-7 items-center rounded-control bg-text px-2.5 text-xs font-semibold text-surface">
                        {t("NotebookReviewDue", { count: due })}
                    </Link>
                )}
                <button type="button" onClick={draft} disabled={drafting} data-testid="cards-draft-ai"
                    className="inline-flex h-7 items-center gap-1.5 rounded-control bg-accent-soft px-2.5 text-xs font-semibold text-accent disabled:opacity-60">
                    <Sparkles size={13} aria-hidden="true" />{drafting ? <AiWaitingLine label={t("NotebookCardsDrafting")} slowNote={false} /> : t("NotebookCardsDraftAi")}
                </button>
                <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
                    aria-label={t("NotebookCardsWrite")} title={t("NotebookCardsWrite")} data-testid="cards-write"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-control border border-border text-text hover:bg-surface-2">
                    <Plus size={14} aria-hidden="true" />
                </button>
            </div>

            {open && (
                <form
                    className="grid gap-2 border-t border-border px-3 py-2.5 md:grid-cols-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void save();
                    }}
                >
                    <label className="flex flex-col gap-1 text-xs font-semibold text-text-2">
                        {t("NotebookCardFront")}
                        <textarea value={front} maxLength={MAX_CARD_SIDE_LENGTH} rows={2} onChange={(e) => setFront(e.target.value)}
                            data-testid="card-front"
                            className="resize-none rounded-control border border-border bg-bg p-2 text-[13px] font-normal text-text outline-none focus:border-accent" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-semibold text-text-2">
                        {t("NotebookCardBack")}
                        <textarea value={back} maxLength={MAX_CARD_SIDE_LENGTH} rows={2} onChange={(e) => setBack(e.target.value)}
                            data-testid="card-back"
                            className="resize-none rounded-control border border-border bg-bg p-2 text-[13px] font-normal text-text outline-none focus:border-accent" />
                    </label>
                    <div className="flex gap-2 md:col-span-2">
                        <button type="submit" disabled={!front.trim() || !back.trim()} data-testid="card-save"
                            className="h-8 rounded-control bg-accent px-3.5 text-xs font-semibold text-on-accent disabled:opacity-60">
                            {editing ? t("NotebookSave") : t("NotebookCardsAdd")}
                        </button>
                        <button type="button" onClick={() => { setEditing(null); setFront(""); setBack(""); setOpen(false); }}
                            className="h-8 rounded-control px-3 text-xs font-semibold text-text-2 hover:text-text">{t("Cancel")}</button>
                    </div>
                </form>
            )}

            {cards.length === 0 && (
                <AiPrivacyNotice
                    messageKey="NotebookCardsPrivacyNotice"
                    testId="cards-privacy-notice"
                    className="border-t border-border px-3 py-2"
                />
            )}

            {cards.length > 0 && (
                <ul className="border-t border-border">
                    {visible.map((card) => {
                        const shown = revealed.has(card.id);
                        return (
                            <li key={card.id} className="group flex items-start gap-1 border-b border-border/60 px-2 py-1 last:border-b-0" data-testid="card-row">
                                <button type="button" onClick={() => reveal(card.id)} aria-expanded={shown} data-testid="card-question"
                                    className="flex min-w-0 flex-1 items-start gap-1.5 rounded-md px-1 py-1 text-left hover:bg-surface-2">
                                    <ChevronRight size={14} aria-hidden="true"
                                        className={`mt-[3px] shrink-0 text-text-3 transition-transform ${shown ? "rotate-90" : ""}`} />
                                    <span className="min-w-0">
                                        <span className={`block text-[13px] font-medium leading-5 text-text ${shown ? "" : "line-clamp-2"}`}>{card.front}</span>
                                        {shown && <span className="mt-0.5 block text-[13px] leading-5 text-text-2" data-testid="card-answer">{card.back}</span>}
                                    </span>
                                </button>
                                <span className="flex shrink-0 items-center md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                                    <button type="button" aria-label={t("NotebookCardEdit")}
                                        onClick={() => { setEditing(card.id); setFront(card.front); setBack(card.back); setOpen(true); }}
                                        className="rounded-md p-1.5 text-text-2 hover:bg-surface-2 hover:text-text">
                                        <Pencil size={13} aria-hidden="true" />
                                    </button>
                                    <button type="button" aria-label={t("NotebookCardDelete")}
                                        onClick={async () => { await deleteCard(card.id, t); await load(); }}
                                        className="rounded-md p-1.5 text-text-2 hover:bg-danger/10 hover:text-danger">
                                        <Trash2 size={13} aria-hidden="true" />
                                    </button>
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
            {cards.length > VISIBLE_CARDS && (
                <button type="button" onClick={() => setShowAll((v) => !v)} data-testid="cards-show-all"
                    className="w-full border-t border-border px-3 py-1.5 text-left text-xs font-semibold text-text-2 hover:bg-surface-2 hover:text-text">
                    {showAll ? t("NotebookCardsShowLess") : t("NotebookCardsShowAll", { count: cards.length })}
                </button>
            )}
            {cards.length === 0 && !open && (
                <div className="border-t border-border px-3 py-2 text-xs text-text-2">{t("NotebookCardsEmpty")}</div>
            )}
        </section>
    );
}
