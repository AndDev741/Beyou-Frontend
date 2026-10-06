import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Copy, FileText, Layers, Send, Sparkles, Trash2 } from "lucide-react";
import type { ChatMessage, Citation, Overview } from "@beyou/types/notebook/notebook";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import {
    appendToPage,
    askStudyQuestion,
    clearStudyChat,
    generateCards,
    generateStudyOutput,
    getStudyRoom,
} from "@beyou/api/notebook";
import NotebookMarkdown from "../NotebookMarkdown";
import CitationPanel from "../CitationPanel";
import ErrorNotice from "../../ErrorNotice";
import Modal from "../../modals/Modal";
import { AiWaitingLine } from "../aiWaiting";

type Props = {
    pageId: string;
    initialMessages: ChatMessage[];
    initialOverview: Overview | null;
    /** Cards made from an answer are due today; the studio's count has to hear about them. */
    onCardsMade?: (count: number) => void;
};

/**
 * The study room's conversation: questions about this page, answered only from its notes and
 * the sources it reads, with every claim numbered back to where it came from.
 *
 * A [n] chip opens the passage right under the answer that cited it, so the reader never loses
 * their place in the conversation to check a source.
 */
export default function ChatPanel({ pageId, initialMessages, initialOverview, onCardsMade }: Props) {
    const { t } = useTranslation();
    const inputId = useId();
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [overview, setOverview] = useState<Overview | null>(initialOverview);
    const [input, setInput] = useState("");
    const [pending, setPending] = useState<string | null>(null);
    const [error, setError] = useState<ApiErrorPayload | null>(null);
    const [overviewBusy, setOverviewBusy] = useState(false);
    const [overviewError, setOverviewError] = useState<ApiErrorPayload | null>(null);
    const [open, setOpen] = useState<{ messageId: string; citation: Citation } | null>(null);
    const [confirmClear, setConfirmClear] = useState(false);
    const [busyAction, setBusyAction] = useState<string | null>(null);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => setMessages(initialMessages), [initialMessages]);
    useEffect(() => setOverview(initialOverview), [initialOverview]);

    useEffect(() => {
        endRef.current?.scrollIntoView?.({ block: "end" });
    }, [messages.length, pending]);

    const ask = async (question: string) => {
        const text = question.trim();
        if (!text || pending) return;
        setPending(text);
        setError(null);
        setInput("");
        const response = await askStudyQuestion(pageId, text, t);
        setPending(null);
        if (response.success) {
            setMessages((current) => [...current, response.success!.question, response.success!.answer]);
        } else {
            setError(response.error ?? null);
            setInput(text);
        }
    };

    const makeOverview = async () => {
        setOverviewBusy(true);
        setOverviewError(null);
        const made = await generateStudyOutput(pageId, "OVERVIEW", t);
        if (made.error) {
            setOverviewBusy(false);
            setOverviewError(made.error);
            return;
        }
        // The generate call answers with the summary but not the suggested questions; the room
        // read has both.
        const room = await getStudyRoom(pageId, t);
        setOverviewBusy(false);
        if (room.success?.overview) setOverview(room.success.overview);
    };

    const saveToPage = async (message: ChatMessage) => {
        setBusyAction(`save-${message.id}`);
        const response = await appendToPage(pageId, message.content, t);
        setBusyAction(null);
        if (response.success) toast.success(t("NotebookStudySavedToPage"));
        else toast.error(getFriendlyErrorMessage(t, response.error));
    };

    const makeCards = async (message: ChatMessage) => {
        setBusyAction(`cards-${message.id}`);
        const response = await generateCards(pageId, { text: message.content, count: 3 }, t);
        setBusyAction(null);
        if (response.success) {
            toast.success(t("NotebookStudyCardsMade", { count: response.success.length }));
            onCardsMade?.(response.success.length);
        } else {
            toast.error(getFriendlyErrorMessage(t, response.error));
        }
    };

    const copy = async (message: ChatMessage) => {
        try {
            await navigator.clipboard?.writeText(message.content);
            toast.success(t("NotebookStudyCopied"));
        } catch {
            /* Clipboard refused (an insecure origin, a denied permission): nothing to tell. */
        }
    };

    const clearChat = async () => {
        setConfirmClear(false);
        const response = await clearStudyChat(pageId, t);
        if (response.error) {
            toast.error(getFriendlyErrorMessage(t, response.error));
            return;
        }
        setMessages([]);
        setOpen(null);
    };

    return (
        <section
            aria-label={t("NotebookStudyChat")}
            className="flex min-w-0 flex-col rounded-card border border-border bg-surface"
        >
            <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex flex-col gap-2.5 rounded-card bg-surface-2 p-4" data-testid="study-overview">
                    <div className="text-xs font-semibold uppercase tracking-[0.06em] text-text-2">
                        {t("NotebookStudyOverviewTitle")}
                    </div>
                    {overview ? (
                        <>
                            <NotebookMarkdown
                                markdown={overview.summary}
                                citations={overview.citations}
                                className="text-sm leading-[22px]"
                            />
                            {overview.questions.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {overview.questions.map((question) => (
                                        <button
                                            key={question}
                                            type="button"
                                            onClick={() => ask(question)}
                                            disabled={pending !== null}
                                            className="rounded-full border border-border bg-surface px-3 py-1 text-left text-[13px] font-medium text-text hover:border-accent disabled:opacity-60"
                                        >
                                            {question}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-start gap-2">
                            <p className="text-sm text-text-2">{t("NotebookStudyOverviewEmpty")}</p>
                            <button
                                type="button"
                                onClick={makeOverview}
                                disabled={overviewBusy}
                                className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-surface px-3 text-[13px] font-semibold text-accent ring-1 ring-border hover:ring-accent disabled:opacity-60"
                            >
                                <Sparkles size={14} aria-hidden="true" />
                                {overviewBusy ? t("NotebookStudyWorking") : t("NotebookStudyOverviewMake")}
                            </button>
                            <ErrorNotice error={overviewError} canReport={false} />
                        </div>
                    )}
                </div>

                {messages.length === 0 && !pending && (
                    <p className="text-sm text-text-2">{t("NotebookStudyChatEmpty")}</p>
                )}

                {messages.map((message) =>
                    message.role === "USER" ? (
                        <div
                            key={message.id}
                            className="max-w-[78%] self-end whitespace-pre-wrap rounded-[16px_16px_4px_16px] bg-accent px-3.5 py-2.5 text-sm leading-[21px] text-on-accent"
                        >
                            {message.content}
                        </div>
                    ) : (
                        <div key={message.id} className="flex items-start gap-3" data-testid="study-answer">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-accent-soft text-accent">
                                <Sparkles size={15} aria-hidden="true" />
                            </span>
                            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                                <NotebookMarkdown
                                    markdown={message.content}
                                    citations={message.citations}
                                    onCitation={(citation) => setOpen({ messageId: message.id, citation })}
                                />
                                {open?.messageId === message.id && (
                                    <CitationPanel citation={open.citation} onClose={() => setOpen(null)} />
                                )}
                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => saveToPage(message)}
                                        disabled={busyAction !== null}
                                        data-testid="study-save-to-page"
                                        className="inline-flex h-[30px] items-center gap-1.5 rounded-[8px] border border-border bg-surface px-2.5 text-xs font-semibold text-text hover:bg-surface-2 disabled:opacity-60"
                                    >
                                        <FileText size={13} aria-hidden="true" />
                                        {t("NotebookStudySaveToPage")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => makeCards(message)}
                                        disabled={busyAction !== null}
                                        className="inline-flex h-[30px] items-center gap-1.5 rounded-[8px] border border-border bg-surface px-2.5 text-xs font-semibold text-text hover:bg-surface-2 disabled:opacity-60"
                                    >
                                        <Layers size={13} aria-hidden="true" />
                                        {busyAction === `cards-${message.id}` ? t("NotebookStudyWorking") : t("NotebookStudyMakeCards")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => copy(message)}
                                        aria-label={t("NotebookStudyCopy")}
                                        className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] text-text-2 hover:bg-surface-2"
                                    >
                                        <Copy size={14} aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                )}

                {pending && (
                    <>
                        <div className="max-w-[78%] self-end whitespace-pre-wrap rounded-[16px_16px_4px_16px] bg-accent px-3.5 py-2.5 text-sm leading-[21px] text-on-accent">
                            {pending}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-text-2" role="status" data-testid="study-thinking">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-accent-soft text-accent">
                                <Sparkles size={15} aria-hidden="true" />
                            </span>
                            <AiWaitingLine label={t("NotebookStudyThinking")} />
                        </div>
                    </>
                )}

                <ErrorNotice error={error} />
                <div ref={endRef} />
            </div>

            <div className="flex flex-col gap-2 border-t border-border px-4 pb-4 pt-3">
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        ask(input);
                    }}
                    className="flex items-center gap-2.5 rounded-[14px] border border-border bg-bg py-1.5 pl-3.5 pr-1.5"
                >
                    <label htmlFor={inputId} className="sr-only">
                        {t("NotebookStudyAskPlaceholder")}
                    </label>
                    <input
                        id={inputId}
                        value={input}
                        maxLength={2000}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={t("NotebookStudyAskPlaceholder")}
                        data-testid="study-chat-input"
                        className="h-[34px] min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-3"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || pending !== null}
                        aria-label={t("NotebookStudySend")}
                        data-testid="study-chat-send"
                        className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent text-on-accent hover:bg-accent-strong disabled:opacity-50"
                    >
                        <Send size={16} aria-hidden="true" />
                    </button>
                </form>
                {messages.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setConfirmClear(true)}
                        className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-text-2 hover:text-danger"
                    >
                        <Trash2 size={13} aria-hidden="true" />
                        {t("NotebookStudyClearChat")}
                    </button>
                )}
            </div>

            <Modal isOpen={confirmClear} onClose={() => setConfirmClear(false)} labelledBy="study-clear-title">
                <h2 id="study-clear-title" className="text-lg font-semibold text-text">
                    {t("NotebookStudyClearChatTitle")}
                </h2>
                <p className="mt-2 text-sm text-text-2">{t("NotebookStudyClearChatBody")}</p>
                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => setConfirmClear(false)}
                        className="h-10 rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text hover:bg-surface-2"
                    >
                        {t("Cancel")}
                    </button>
                    <button
                        type="button"
                        onClick={clearChat}
                        data-testid="study-clear-confirm"
                        className="h-10 rounded-control bg-danger/10 px-4 text-sm font-semibold text-danger hover:bg-danger/15"
                    >
                        {t("NotebookStudyClearChatConfirm")}
                    </button>
                </div>
            </Modal>
        </section>
    );
}
