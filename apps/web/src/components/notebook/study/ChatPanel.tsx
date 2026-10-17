import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Copy, FilePlus, FileText, Layers, Lightbulb, Maximize2, Send, Sparkles, Trash2 } from "lucide-react";
import type { ChatMessage, Citation, NotebookPage, Overview } from "@beyou/types/notebook/notebook";
import type { DiagramSpec } from "@beyou/types/notebook/diagram";
import { sanitizeDiagram } from "@beyou/state";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import {
    appendDiagramToPage,
    appendToPage,
    askStudyQuestion,
    clearStudyChat,
    generateCards,
    generateStudyOutput,
    getStudyRoom,
} from "@beyou/api/notebook";
import NotebookMarkdown from "../NotebookMarkdown";
import CitationPanel from "../CitationPanel";
import AiPrivacyNotice from "../../agent/AiPrivacyNotice";
import ErrorNotice from "../../ErrorNotice";
import Modal from "../../modals/Modal";
import { AiWaitingLine } from "../aiWaiting";
import DiagramCard from "../diagram/DiagramCard";
import DiagramEditorDialog from "../diagram/DiagramEditorDialog";
import DiagramFullscreen from "../diagram/DiagramFullscreen";

type Props = {
    pageId: string;
    initialMessages: ChatMessage[];
    initialOverview: Overview | null;
    /** Cards made from an answer are due today; the studio's count has to hear about them. */
    onCardsMade?: (count: number) => void;
    /**
     * The page as it stands after "Save to page". The room puts it in the store, so notes open
     * beside the chat merge the new blocks in instead of saving over them.
     */
    onSavedToPage?: (page: NotebookPage) => void;
    /** For the "Saved to <page>" note when a diagram goes into the notes open beside the chat. */
    pageTitle?: string;
    /**
     * Puts a diagram into the page's notes when they are open beside the chat, and says whether
     * it could. The live editor has to take it: an append through the server would be written
     * over by that editor's next autosave. When the notes are not open this answers false and
     * the diagram is appended on the server instead.
     */
    insertIntoNotes?: (spec: DiagramSpec) => boolean;
};

/** The question box grows with what is typed, up to this height, then scrolls. */
const INPUT_MAX_HEIGHT = 200;

/**
 * The study room's conversation: questions about this page, answered only from its notes and
 * the sources it reads, with every claim numbered back to where it came from.
 *
 * A [n] chip opens the passage right under the answer that cited it, so the reader never loses
 * their place in the conversation to check a source.
 */
export default function ChatPanel({
    pageId, initialMessages, initialOverview, onCardsMade, onSavedToPage, pageTitle = "", insertIntoNotes,
}: Props) {
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
    /** A diagram adjusted here replaces the answer's in this conversation only; it is what "Save" saves. */
    const [adjusted, setAdjusted] = useState<Record<string, DiagramSpec>>({});
    const [diagramDialog, setDiagramDialog] = useState<{ messageId: string; mode: "adjust" | "fullscreen" } | null>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => setMessages(initialMessages), [initialMessages]);
    useEffect(() => setOverview(initialOverview), [initialOverview]);

    useEffect(() => {
        endRef.current?.scrollIntoView?.({ block: "end" });
    }, [messages.length, pending]);

    // Fit the box to its text: shrink to one line first so deleting lines shrinks it too.
    useLayoutEffect(() => {
        const box = inputRef.current;
        if (!box) return;
        box.style.height = "auto";
        box.style.height = `${Math.min(box.scrollHeight, INPUT_MAX_HEIGHT)}px`;
    }, [input]);

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

    // Enter sends and Shift+Enter starts a new line, the way chat boxes work. A key that ends an
    // IME composition (accents on some layouts, CJK input) is the composition's, never a send.
    const onInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
        event.preventDefault();
        void ask(input);
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
        if (response.success) {
            toast.success(t("NotebookStudySavedToPage"));
            onSavedToPage?.(response.success);
        } else {
            toast.error(getFriendlyErrorMessage(t, response.error));
        }
    };

    // The tutor's diagrams, cleaned once per conversation change rather than on every render.
    const diagrams = useMemo(() => {
        const map = new Map<string, DiagramSpec>();
        for (const message of messages) {
            const clean = message.diagram ? sanitizeDiagram(message.diagram) : null;
            if (clean) map.set(message.id, clean);
        }
        return map;
    }, [messages]);
    const diagramOf = (messageId: string): DiagramSpec | null => adjusted[messageId] ?? diagrams.get(messageId) ?? null;

    const saveDiagram = async (message: ChatMessage, spec: DiagramSpec) => {
        if (insertIntoNotes?.(spec)) {
            toast.success(t("DiagramSaved", { title: pageTitle }));
            return;
        }
        setBusyAction(`diagram-${message.id}`);
        const response = await appendDiagramToPage(pageId, spec, t);
        setBusyAction(null);
        if (response.success) {
            toast.success(t("DiagramSaved", { title: response.success.title ?? pageTitle }));
            onSavedToPage?.(response.success);
        } else {
            toast.error(response.error?.errorKey ? getFriendlyErrorMessage(t, response.error) : t("DiagramSaveFailed"));
        }
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
                    <div className="flex flex-col gap-2">
                        <p className="text-sm text-text-2">{t("NotebookStudyChatEmpty")}</p>
                        <AiPrivacyNotice messageKey="NotebookStudyPrivacyNotice" testId="study-privacy-notice" />
                    </div>
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
                                {diagramOf(message.id) && (
                                    <DiagramCard
                                        spec={diagramOf(message.id)}
                                        testId="study-diagram-card"
                                        // Cited answers drew on the notes and sources; the rest on what the AI knows.
                                        source={message.citations.length > 0 ? "notes" : "ai"}
                                        sourceTestId="study-diagram-source"
                                        actions={
                                            <>
                                                <button type="button" onClick={() => void saveDiagram(message, diagramOf(message.id)!)}
                                                    disabled={busyAction !== null} data-testid="study-diagram-save"
                                                    className="inline-flex h-10 items-center gap-2 rounded-control bg-accent px-3.5 text-sm font-semibold text-on-accent hover:bg-accent-strong disabled:opacity-60">
                                                    <FilePlus size={16} aria-hidden="true" />
                                                    {busyAction === `diagram-${message.id}` ? t("NotebookStudyWorking") : t("DiagramSaveToPage")}
                                                </button>
                                                <button type="button" onClick={() => setDiagramDialog({ messageId: message.id, mode: "adjust" })}
                                                    data-testid="study-diagram-adjust"
                                                    className="inline-flex h-10 items-center gap-2 rounded-control border border-border bg-surface px-3.5 text-sm font-semibold text-text hover:bg-surface-2">
                                                    <Sparkles size={16} aria-hidden="true" />{t("DiagramAdjust")}
                                                </button>
                                                <span className="flex-1" />
                                                <button type="button" onClick={() => setDiagramDialog({ messageId: message.id, mode: "fullscreen" })}
                                                    aria-label={t("DiagramFullscreen")} title={t("DiagramFullscreen")}
                                                    data-testid="study-diagram-fullscreen"
                                                    className="flex h-10 w-10 items-center justify-center rounded-control border border-border bg-surface text-text hover:bg-surface-2">
                                                    <Maximize2 size={16} aria-hidden="true" />
                                                </button>
                                            </>
                                        }
                                    />
                                )}
                                {open?.messageId === message.id && (
                                    <CitationPanel citation={open.citation} onClose={() => setOpen(null)} />
                                )}
                                {/* No citation means nothing here came from the person's notes or sources: the
                                    tutor answered from its own knowledge, and the reader should know that. */}
                                {message.citations.length === 0 && (
                                    <span data-testid="study-answer-general"
                                        className="inline-flex items-center gap-1.5 self-start rounded-full bg-surface-2 px-2.5 py-1 text-[11.5px] font-semibold text-text-2">
                                        <Lightbulb size={12} aria-hidden="true" />{t("NotebookStudyGeneralKnowledge")}
                                    </span>
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

            {/* Stays in view while a long conversation scrolls past it. */}
            <div className="sticky bottom-0 z-10 flex flex-col gap-2 rounded-b-card border-t border-border bg-surface px-4 pb-4 pt-3">
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        ask(input);
                    }}
                    className="flex items-end gap-2.5 rounded-[14px] border border-border bg-bg py-1.5 pl-3.5 pr-1.5"
                >
                    <label htmlFor={inputId} className="sr-only">
                        {t("NotebookStudyAskPlaceholder")}
                    </label>
                    <textarea
                        ref={inputRef}
                        id={inputId}
                        value={input}
                        rows={1}
                        maxLength={2000}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={onInputKeyDown}
                        placeholder={t("NotebookStudyAskPlaceholder")}
                        aria-describedby={`${inputId}-hint`}
                        data-testid="study-chat-input"
                        className="min-h-[34px] min-w-0 flex-1 resize-none bg-transparent py-[7px] text-sm leading-5 text-text outline-none placeholder:text-text-3"
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
                <p id={`${inputId}-hint`} className="sr-only">{t("NotebookStudyAskHint")}</p>
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

            {diagramDialog?.mode === "adjust" && diagramOf(diagramDialog.messageId) && (
                <DiagramEditorDialog
                    isOpen
                    onClose={() => setDiagramDialog(null)}
                    spec={diagramOf(diagramDialog.messageId)!}
                    pageId={pageId}
                    focusInstruction
                    onSave={(next) => setAdjusted((current) => ({ ...current, [diagramDialog.messageId]: next }))}
                />
            )}
            <DiagramFullscreen
                spec={diagramDialog ? diagramOf(diagramDialog.messageId) : null}
                isOpen={diagramDialog?.mode === "fullscreen"}
                onClose={() => setDiagramDialog(null)}
            />

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
