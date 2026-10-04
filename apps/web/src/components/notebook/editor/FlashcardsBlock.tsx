import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Layers, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import type { Flashcard } from "@beyou/types/notebook/notebook";
import { MAX_CARD_SIDE_LENGTH } from "@beyou/types/notebook/notebook";
import { createCard, deleteCard, generateCards, getPageCards, updateCard } from "@beyou/api/notebook";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import useTodayInZone from "../../../hooks/useTodayInZone";

/**
 * A page's flashcards as a block: the deck, a form to write one, and "Draft with AI", which reads
 * the page (and its sources) and saves the cards it writes. Reviewing happens in the review
 * session, which the block links to when anything is due.
 */
export default function FlashcardsBlock({ pageId }: { pageId: string }) {
    const { t } = useTranslation();
    const [cards, setCards] = useState<Flashcard[]>([]);
    const [front, setFront] = useState("");
    const [back, setBack] = useState("");
    const [editing, setEditing] = useState<string | null>(null);
    const [drafting, setDrafting] = useState(false);
    const [open, setOpen] = useState(false);
    // The owner's day, the same one the server files due dates under.
    const today = useTodayInZone();

    const load = useCallback(async () => {
        const response = await getPageCards(pageId, t);
        if (response.success) setCards(response.success);
    }, [pageId, t]);

    useEffect(() => {
        void load();
    }, [load]);

    const due = cards.filter((c) => c.dueOn <= today).length;

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
            className="my-2 w-full rounded-card border border-border bg-surface p-4"
        >
            <div className="flex flex-wrap items-center gap-2">
                <Layers size={16} className="text-xp" aria-hidden="true" />
                <span className="text-sm font-semibold text-text">{t("NotebookCardsTitle")}</span>
                <span className="text-xs text-text-2">{t("NotebookCardsCount", { count: cards.length, due })}</span>
                <span className="flex-1" />
                {due > 0 && (
                    <Link to={`/notebook/review?page=${pageId}`} className="rounded-control bg-text px-3 py-1.5 text-xs font-semibold text-surface">
                        {t("NotebookReviewDue", { count: due })}
                    </Link>
                )}
                <button type="button" onClick={draft} disabled={drafting} data-testid="cards-draft-ai"
                    className="inline-flex items-center gap-1.5 rounded-control bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent disabled:opacity-60">
                    <Sparkles size={13} aria-hidden="true" />{drafting ? t("NotebookCardsDrafting") : t("NotebookCardsDraftAi")}
                </button>
                <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
                    className="inline-flex items-center gap-1.5 rounded-control border border-border px-3 py-1.5 text-xs font-semibold text-text">
                    <Plus size={13} aria-hidden="true" />{t("NotebookCardsWrite")}
                </button>
            </div>

            {open && (
                <form
                    className="mt-3 grid gap-2 md:grid-cols-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void save();
                    }}
                >
                    <label className="flex flex-col gap-1 text-xs font-semibold text-text-2">
                        {t("NotebookCardFront")}
                        <textarea value={front} maxLength={MAX_CARD_SIDE_LENGTH} rows={2} onChange={(e) => setFront(e.target.value)}
                            data-testid="card-front"
                            className="resize-none rounded-control border border-border bg-bg p-2 text-sm font-normal text-text outline-none focus:border-accent" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-semibold text-text-2">
                        {t("NotebookCardBack")}
                        <textarea value={back} maxLength={MAX_CARD_SIDE_LENGTH} rows={2} onChange={(e) => setBack(e.target.value)}
                            data-testid="card-back"
                            className="resize-none rounded-control border border-border bg-bg p-2 text-sm font-normal text-text outline-none focus:border-accent" />
                    </label>
                    <div className="flex gap-2 md:col-span-2">
                        <button type="submit" disabled={!front.trim() || !back.trim()} data-testid="card-save"
                            className="rounded-control bg-accent px-4 py-1.5 text-sm font-semibold text-on-accent disabled:opacity-60">
                            {editing ? t("NotebookSave") : t("NotebookCardsAdd")}
                        </button>
                        {editing && (
                            <button type="button" onClick={() => { setEditing(null); setFront(""); setBack(""); }}
                                className="rounded-control px-3 py-1.5 text-sm font-semibold text-text-2">{t("Cancel")}</button>
                        )}
                    </div>
                </form>
            )}

            {cards.length > 0 && (
                <ul className="mt-3 divide-y divide-border">
                    {cards.map((card) => (
                        <li key={card.id} className="flex items-start gap-3 py-2" data-testid="card-row">
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-text">{card.front}</p>
                                <p className="text-sm text-text-2">{card.back}</p>
                            </div>
                            <button type="button" aria-label={t("NotebookCardEdit")}
                                onClick={() => { setEditing(card.id); setFront(card.front); setBack(card.back); setOpen(true); }}
                                className="rounded-lg p-1.5 text-text-2 hover:bg-surface-2">
                                <Pencil size={14} aria-hidden="true" />
                            </button>
                            <button type="button" aria-label={t("NotebookCardDelete")}
                                onClick={async () => { await deleteCard(card.id, t); await load(); }}
                                className="rounded-lg p-1.5 text-text-2 hover:bg-danger/10 hover:text-danger">
                                <Trash2 size={14} aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {cards.length === 0 && !open && <p className="mt-2 text-sm text-text-2">{t("NotebookCardsEmpty")}</p>}
        </section>
    );
}
