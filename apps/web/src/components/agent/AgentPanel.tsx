import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "react-toastify";
import { History, Maximize2, Minimize2, Plus, Send, Sparkles, Trash2, X } from "lucide-react";
import { agentChat, agentMessage } from "@beyou/types/agent/chatType";
import {
    createAgentChat,
    deleteAgentChat,
    getAgentChats,
    getAgentMessages,
    sendAgentMessage,
} from "@beyou/api/agent/agentChats";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import AgentMarkdown from "./AgentMarkdown";

const VISIBLE_ROLES = ["USER", "ASSISTANT"];
const AUTO_TITLE_MAX = 40;

type AgentPanelProps = {
    open: boolean;
    onClose: () => void;
};

function TypingDots() {
    return (
        <div className="flex items-center gap-1.5 px-4 py-3.5" aria-hidden="true">
            {[0, 150, 300].map((delay) => (
                <span
                    key={delay}
                    className="h-2 w-2 animate-bounce rounded-full bg-primary/60"
                    style={{ animationDelay: `${delay}ms` }}
                />
            ))}
        </div>
    );
}

/**
 * The chat surface behind the FAB. Three shells, same content:
 * mobile = fullscreen sheet, desktop = popover anchored to the FAB,
 * desktop expanded = centered overlay with a persistent history column.
 * Stays mounted once opened so the conversation survives page changes.
 */
function AgentPanel({ open, onClose }: AgentPanelProps) {
    const { t, i18n } = useTranslation();
    const reducedMotion = useReducedMotion();

    const [expanded, setExpanded] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [chats, setChats] = useState<agentChat[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<agentMessage[]>([]);
    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

    const openChat = useCallback(async (chatId: string) => {
        setActiveChatId(chatId);
        setHistoryOpen(false);
        setMessages([]);
        const response = await getAgentMessages(chatId, t);
        if (response.success) {
            setMessages(response.success.filter((m) => VISIBLE_ROLES.includes(m.role)));
        } else {
            toast.error(getFriendlyErrorMessage(t, response.error));
        }
    }, [t]);

    // First mount (= first FAB click): load the list and resume the most
    // recent conversation — the backend already orders by activity.
    useEffect(() => {
        const loadChats = async () => {
            const response = await getAgentChats(t);
            if (!response.success) {
                toast.error(getFriendlyErrorMessage(t, response.error));
                return;
            }
            setChats(response.success);
            if (response.success.length > 0) openChat(response.success[0].id);
        };
        loadChats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (open) {
            bottomRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
        }
    }, [messages, isSending, open, reducedMotion]);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    const startNewChat = () => {
        // No server round-trip: the chat row is only created with the first message.
        setActiveChatId(null);
        setMessages([]);
        setHistoryOpen(false);
        inputRef.current?.focus();
    };

    const removeChat = async (chatId: string) => {
        const response = await deleteAgentChat(chatId, t);
        if (response.error) {
            toast.error(getFriendlyErrorMessage(t, response.error));
            return;
        }
        setChats((prev) => prev.filter((c) => c.id !== chatId));
        setConfirmDeleteId(null);
        if (activeChatId === chatId) {
            setActiveChatId(null);
            setMessages([]);
        }
    };

    const send = async (rawText?: string) => {
        const text = (rawText ?? input).trim();
        if (!text || isSending) return;

        setInput("");
        setIsSending(true);
        setMessages((prev) => [...prev, { role: "USER", text }]);

        try {
            let chatId = activeChatId;
            if (!chatId) {
                // First message names the chat so the history never fills with "New chat".
                const created = await createAgentChat(t, text.slice(0, AUTO_TITLE_MAX));
                if (!created.success) {
                    toast.error(getFriendlyErrorMessage(t, created.error));
                    setMessages((prev) => prev.slice(0, -1));
                    return;
                }
                chatId = created.success.id;
                setActiveChatId(chatId);
                setChats((prev) => [created.success as agentChat, ...prev]);
            }

            const response = await sendAgentMessage(chatId, text, t);
            if (response.success) {
                setMessages((prev) => [...prev, { role: "ASSISTANT", text: response.success as string }]);
                setChats((prev) => {
                    const current = prev.find((c) => c.id === chatId);
                    if (!current) return prev;
                    const bumped = { ...current, updatedAt: new Date().toISOString() };
                    return [bumped, ...prev.filter((c) => c.id !== chatId)];
                });
            } else {
                toast.error(getFriendlyErrorMessage(t, response.error));
                setMessages((prev) => prev.slice(0, -1));
                setInput(text);
            }
        } finally {
            setIsSending(false);
        }
    };

    const onInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    const formatDay = (iso: string) =>
        new Date(iso).toLocaleDateString(i18n.language, { day: "2-digit", month: "short" });

    const suggestions = [t("AgentSuggestion1"), t("AgentSuggestion2"), t("AgentSuggestion3")];

    const chatList = (
        <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {chats.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-description">{t("NoChatsYet")}</p>
            )}
            {chats.map((chat) => (
                <div
                    key={chat.id}
                    className={`group flex items-center rounded-xl transition-colors duration-150 ${
                        chat.id === activeChatId
                            ? "bg-primary/10 shadow-[inset_3px_0_0_0_var(--primary)]"
                            : "hover:bg-primary/5"
                    }`}
                >
                    <button
                        type="button"
                        onClick={() => openChat(chat.id)}
                        className="flex min-w-0 flex-1 flex-col items-start gap-0.5 px-3 py-2.5 text-left"
                    >
                        <span className="w-full truncate text-sm font-medium">{chat.title}</span>
                        <span className="text-xs text-description">{formatDay(chat.updatedAt)}</span>
                    </button>
                    <button
                        type="button"
                        aria-label={confirmDeleteId === chat.id ? t("ConfirmDeleteChat") : t("DeleteChat")}
                        title={confirmDeleteId === chat.id ? t("ConfirmDeleteChat") : t("DeleteChat")}
                        onClick={() =>
                            confirmDeleteId === chat.id ? removeChat(chat.id) : setConfirmDeleteId(chat.id)
                        }
                        onBlur={() => setConfirmDeleteId(null)}
                        className={`mr-2 rounded-lg p-2 transition-all duration-150 ${
                            confirmDeleteId === chat.id
                                ? "bg-error/15 text-error"
                                : "text-description hover:text-error"
                        }`}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ))}
        </div>
    );

    const headerButton = "rounded-lg p-2 text-secondary transition-colors duration-150 hover:bg-primary/10";

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop — expanded desktop only */}
                    {expanded && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 z-40 hidden bg-black/40 lg:block"
                            aria-hidden
                        />
                    )}

                    <motion.div
                        role="dialog"
                        aria-label={t("AiAssistant")}
                        initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.92, y: reducedMotion ? 0 : 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.92, y: reducedMotion ? 0 : 12 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        style={{ transformOrigin: expanded ? "center" : "bottom right" }}
                        className={`fixed inset-0 z-50 flex flex-col overflow-hidden bg-background
                        text-secondary shadow-2xl shadow-black/20 lg:rounded-2xl lg:border
                        lg:border-primary/15 ${
                            expanded
                                ? "lg:inset-x-0 lg:top-[7.5vh] lg:bottom-auto lg:mx-auto lg:h-[85vh] lg:w-[min(920px,92vw)]"
                                : "lg:inset-auto lg:bottom-[92px] lg:right-6 lg:h-[min(600px,calc(100vh-120px))] lg:w-[380px]"
                        }`}
                    >
                        <div className="flex min-h-0 flex-1">
                            {/* Persistent history column — expanded desktop only */}
                            {expanded && (
                                <aside className="hidden w-72 flex-col border-r border-primary/15 lg:flex">
                                    <div className="flex items-center justify-between p-4 pb-2">
                                        <h2 className="text-lg font-semibold">{t("AgentChats")}</h2>
                                        <button
                                            type="button"
                                            onClick={startNewChat}
                                            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2
                                            text-sm font-semibold text-white transition-transform duration-200
                                            hover:scale-105"
                                        >
                                            <Plus size={16} />
                                            {t("NewChat")}
                                        </button>
                                    </div>
                                    {chatList}
                                </aside>
                            )}

                            {/* Thread column */}
                            <div className="relative flex min-w-0 flex-1 flex-col">
                                {/* Header */}
                                <div className="flex items-center gap-2 border-b border-primary/10 px-3 py-2.5">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                        <Sparkles size={16} className="text-primary" />
                                    </span>
                                    <h2 className="min-w-0 flex-1 truncate font-semibold">
                                        {activeChat ? activeChat.title : t("AiAssistant")}
                                    </h2>

                                    <button
                                        type="button"
                                        aria-label={t("ChatHistory")}
                                        title={t("ChatHistory")}
                                        onClick={() => setHistoryOpen((v) => !v)}
                                        className={`${headerButton} ${expanded ? "lg:hidden" : ""}`}
                                    >
                                        <History size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={t("NewChat")}
                                        title={t("NewChat")}
                                        onClick={startNewChat}
                                        className={headerButton}
                                    >
                                        <Plus size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={expanded ? t("MinimizeChat") : t("ExpandChat")}
                                        title={expanded ? t("MinimizeChat") : t("ExpandChat")}
                                        onClick={() => setExpanded((v) => !v)}
                                        className={`${headerButton} hidden lg:block`}
                                    >
                                        {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={t("CloseAssistant")}
                                        title={t("CloseAssistant")}
                                        onClick={onClose}
                                        className={headerButton}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* History drawer — popover & mobile */}
                                <AnimatePresence>
                                    {historyOpen && (
                                        <motion.aside
                                            initial={{ x: reducedMotion ? 0 : -320, opacity: reducedMotion ? 0 : 1 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            exit={{ x: reducedMotion ? 0 : -320, opacity: reducedMotion ? 0 : 1 }}
                                            transition={{ duration: 0.2, ease: "easeOut" }}
                                            className={`absolute bottom-0 left-0 top-[53px] z-10 flex w-72 max-w-[85%]
                                            flex-col border-r border-primary/15 bg-background shadow-xl
                                            ${expanded ? "lg:hidden" : ""}`}
                                        >
                                            <div className="flex items-center justify-between p-3 pb-1">
                                                <h3 className="font-semibold">{t("AgentChats")}</h3>
                                                <button
                                                    type="button"
                                                    aria-label={t("CloseHistory")}
                                                    onClick={() => setHistoryOpen(false)}
                                                    className={headerButton}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            {chatList}
                                        </motion.aside>
                                    )}
                                </AnimatePresence>

                                {/* Messages / empty state */}
                                <div className="flex-1 overflow-y-auto" onClick={() => setHistoryOpen(false)}>
                                    {messages.length === 0 && !isSending ? (
                                        <div className="flex h-full flex-col items-center justify-center gap-3 px-5 text-center">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-full
                                            bg-primary/10 ring-8 ring-primary/5">
                                                <Sparkles size={24} className="text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-semibold">{t("AgentEmptyTitle")}</h3>
                                                <p className="mt-1 max-w-md text-sm text-description">{t("AgentEmptySubtitle")}</p>
                                            </div>
                                            <div className="mt-1 flex flex-wrap justify-center gap-2">
                                                {suggestions.map((suggestion) => (
                                                    <button
                                                        key={suggestion}
                                                        type="button"
                                                        onClick={() => send(suggestion)}
                                                        className="rounded-full border border-primary/30 px-3.5 py-1.5
                                                        text-sm text-secondary transition-colors duration-200
                                                        hover:bg-primary hover:text-white"
                                                    >
                                                        {suggestion}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-3 py-4">
                                            {messages.map((message, index) => (
                                                <motion.div
                                                    key={`${index}-${message.role}`}
                                                    initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[15px]
                                                    leading-relaxed ${
                                                        message.role === "USER"
                                                            ? "self-end whitespace-pre-wrap rounded-br-md bg-primary text-white shadow-sm"
                                                            : "self-start rounded-bl-md border border-primary/10 bg-primary/5"
                                                    }`}
                                                >
                                                    {message.role === "USER"
                                                        ? message.text
                                                        : <AgentMarkdown text={message.text} />}
                                                </motion.div>
                                            ))}
                                            {isSending && (
                                                <div className="max-w-[75%] self-start rounded-2xl rounded-bl-md border
                                                border-primary/10 bg-primary/5"
                                                    aria-label={t("AgentThinking")}
                                                >
                                                    <TypingDots />
                                                </div>
                                            )}
                                            <div ref={bottomRef} />
                                        </div>
                                    )}
                                </div>

                                {/* Composer */}
                                <div className="border-t border-primary/10 p-2.5">
                                    <div className="mx-auto flex w-full max-w-3xl items-end gap-2">
                                        <textarea
                                            ref={inputRef}
                                            rows={1}
                                            value={input}
                                            onChange={(e) => {
                                                setInput(e.target.value);
                                                e.target.style.height = "auto";
                                                e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
                                            }}
                                            onKeyDown={onInputKeyDown}
                                            placeholder={t("AgentInputPlaceholder")}
                                            maxLength={4000}
                                            className="max-h-32 flex-1 resize-none rounded-2xl border border-primary/25
                                            bg-background px-4 py-2.5 text-[15px] text-secondary outline-none
                                            placeholder:text-placeholder focus:border-primary focus:ring-2
                                            focus:ring-primary/20"
                                        />
                                        <button
                                            type="button"
                                            aria-label={t("AgentSend")}
                                            onClick={() => send()}
                                            disabled={!input.trim() || isSending}
                                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full
                                            bg-primary text-white transition-all duration-200 hover:scale-105
                                            disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                                        >
                                            <Send size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default AgentPanel;
