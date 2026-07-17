import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "react-toastify";
import { Check, History, Maximize2, Minimize2, Pencil, Plus, Send, Sparkles, Trash2, X } from "lucide-react";
import { agentChat, agentMessage, agentSegment } from "@beyou/types/agent/chatType";
import {
    createAgentChat,
    deleteAgentChat,
    deleteAllAgentChats,
    getAgentChats,
    getAgentMessages,
    renameAgentChat,
} from "@beyou/api/agent/agentChats";
import { streamAgentMessage } from "@beyou/api/agent/agentStream";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import { useAgentRefresh } from "../../hooks/useAgentRefresh";
import Modal from "../modals/Modal";
import AgentSegments from "./AgentSegments";

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
    const location = useLocation();
    const refreshDomains = useAgentRefresh();
    // Ref so an in-flight send captures the page the message was SENT from.
    const currentPageRef = useRef(location.pathname);
    currentPageRef.current = location.pathname;

    const [expanded, setExpanded] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [chats, setChats] = useState<agentChat[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<agentMessage[]>([]);
    const [input, setInput] = useState("");
    // Which chat currently has a stream in flight (null = none). Per-chat, so
    // switching away doesn't lock the composer or show a phantom "thinking"
    // bubble in a different chat.
    const [streamingChatId, setStreamingChatId] = useState<string | null>(null);
    // Pending destructive action awaiting confirmation in the shared Modal —
    // one chat, or "all" (reset). Clearer than a two-tap-to-confirm button.
    const [confirm, setConfirm] = useState<{ kind: "chat"; chat: agentChat } | { kind: "all" } | null>(null);
    // Inline chat-title editing.
    const [editingChatId, setEditingChatId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState("");
    // Streaming reply in flight: segments accumulate in a ref (cheap) and are
    // flushed to state once per animation frame — a setState per token would
    // re-render the markdown tree dozens of times a second.
    const [streamSegments, setStreamSegments] = useState<agentSegment[]>([]);
    const streamSegmentsRef = useRef<agentSegment[]>([]);
    const rafRef = useRef<number | null>(null);
    // Cancels the in-flight fetch on unmount (logout) / chat switch, so the
    // reader stops and we stop paying for the LLM instead of firing setState
    // into an unmounted tree.
    const abortRef = useRef<AbortController | null>(null);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    // Mirrors activeChatId for in-flight sends: if the user switches chats
    // while the agent is replying, the reply must NOT land in the new thread.
    // Updated explicitly at every transition (state updates are async, so a
    // render-time mirror alone misses the create-chat-then-send path).
    const activeChatIdRef = useRef<string | null>(null);

    const activeChat = chats.find((c) => c.id === activeChatId) ?? null;
    // The composer/indicator reflect only the chat being viewed.
    const isSending = streamingChatId !== null && streamingChatId === activeChatId;

    const resetInputHeight = () => {
        if (inputRef.current) {
            inputRef.current.style.height = "auto";
            inputRef.current.style.overflowY = "hidden";
        }
    };

    const scheduleStreamFlush = useCallback(() => {
        if (rafRef.current != null) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            setStreamSegments([...streamSegmentsRef.current]);
        });
    }, []);

    const clearStreaming = useCallback(() => {
        if (rafRef.current != null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        abortRef.current?.abort();
        abortRef.current = null;
        streamSegmentsRef.current = [];
        setStreamSegments([]);
    }, []);

    // Stop any in-flight stream when the panel unmounts (e.g. logout tears down
    // the ProtectedRoute subtree while a reply is still streaming).
    useEffect(() => () => abortRef.current?.abort(), []);

    // Live segment building, mirroring the backend AgentTurnBuilder: tokens
    // extend the trailing text run; a finished tool replaces its started chip.
    const appendToken = useCallback((token: string) => {
        const segs = streamSegmentsRef.current;
        const last = segs[segs.length - 1];
        if (last && last.type === "text") {
            segs[segs.length - 1] = { ...last, text: (last.text ?? "") + token };
        } else {
            segs.push({ type: "text", text: token });
        }
    }, []);

    const applyToolEvent = useCallback((tool: agentSegment) => {
        const segs = streamSegmentsRef.current;
        if (tool.status === "started") {
            segs.push(tool);
            return;
        }
        for (let i = segs.length - 1; i >= 0; i--) {
            const seg = segs[i];
            if (seg.type === "tool" && seg.tool === tool.tool && seg.status === "started") {
                segs[i] = tool;
                return;
            }
        }
        segs.push(tool);
    }, []);

    const openChat = useCallback(async (chatId: string) => {
        setActiveChatId(chatId);
        activeChatIdRef.current = chatId;
        setHistoryOpen(false);
        setMessages([]);
        // An in-flight stream belongs to the previous chat — stop showing it.
        clearStreaming();
        const response = await getAgentMessages(chatId, t);
        if (response.success) {
            setMessages(response.success.filter((m) => VISIBLE_ROLES.includes(m.role)));
        } else {
            toast.error(getFriendlyErrorMessage(t, response.error));
        }
    }, [t, clearStreaming]);

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
    }, [messages, isSending, streamSegments, open, reducedMotion]);

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
        activeChatIdRef.current = null;
        setMessages([]);
        clearStreaming();
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
        if (activeChatId === chatId) {
            setActiveChatId(null);
            activeChatIdRef.current = null;
            setMessages([]);
            clearStreaming();
        }
    };

    const bumpChat = (chatId: string) => {
        setChats((prev) => {
            const current = prev.find((c) => c.id === chatId);
            if (!current) return prev;
            const bumped = { ...current, updatedAt: new Date().toISOString() };
            return [bumped, ...prev.filter((c) => c.id !== chatId)];
        });
    };

    const startRename = (chat: agentChat) => {
        setEditingChatId(chat.id);
        setEditingTitle(chat.title);
    };

    const saveRename = async (chatId: string) => {
        const title = editingTitle.trim();
        setEditingChatId(null);
        const current = chats.find((c) => c.id === chatId);
        if (!title || title === current?.title) return; // nothing to do
        const response = await renameAgentChat(chatId, title, t);
        if (response.error) {
            toast.error(getFriendlyErrorMessage(t, response.error));
            return;
        }
        setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title } : c)));
    };

    const clearAllChats = async () => {
        const response = await deleteAllAgentChats(t);
        if (response.error) {
            toast.error(getFriendlyErrorMessage(t, response.error));
            return;
        }
        setChats([]);
        setActiveChatId(null);
        activeChatIdRef.current = null;
        setMessages([]);
        clearStreaming();
        toast.success(t("ClearAllChatsDone"));
    };

    const runConfirm = () => {
        if (!confirm) return;
        if (confirm.kind === "chat") removeChat(confirm.chat.id);
        else clearAllChats();
        setConfirm(null);
    };

    const send = async (rawText?: string) => {
        const text = (rawText ?? input).trim();
        if (!text || isSending) return;

        setInput("");
        resetInputHeight();
        setMessages((prev) => [...prev, { role: "USER", segments: [{ type: "text", text }] }]);

        // Fresh cancel handle for this stream (abort any prior in-flight one).
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        let chatId = activeChatId;
        try {
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
                activeChatIdRef.current = chatId;
                setChats((prev) => [created.success as agentChat, ...prev]);
            }
            setStreamingChatId(chatId);

            // The user may switch chats while the agent streams — the exchange
            // is persisted server-side and will show up when the original chat
            // is reopened, so events for another thread are dropped, not shown.
            const onThisChat = () => activeChatIdRef.current === chatId;

            await streamAgentMessage(chatId, text, {
                onToken: (token) => {
                    if (!onThisChat()) return;
                    appendToken(token);
                    scheduleStreamFlush();
                },
                onTool: (event) => {
                    if (!onThisChat()) return;
                    applyToolEvent({
                        type: "tool",
                        tool: event.tool,
                        status: event.status,
                        error: event.error,
                        domains: event.domains,
                    });
                    scheduleStreamFlush();
                },
                onDone: (segments) => {
                    if (onThisChat()) {
                        // Live segments are best-effort display; done is the source of truth.
                        setMessages((prev) => [...prev, { role: "ASSISTANT", segments }]);
                        clearStreaming();
                    }
                    bumpChat(chatId as string);
                    // Refetch exactly the slices the agent's write tools touched,
                    // once, from the union of domains across the whole turn.
                    const domains = segments.flatMap((s) => (s.type === "tool" ? s.domains ?? [] : []));
                    if (domains.length) refreshDomains(domains);
                },
                onError: (errorKey) => {
                    if (!onThisChat()) return;
                    toast.error(t(errorKey, { defaultValue: t("UnexpectedError") }));
                    clearStreaming();
                    setMessages((prev) => prev.slice(0, -1));
                    setInput(text);
                },
            }, currentPageRef.current, controller.signal);
        } finally {
            // Clear only if a newer send hasn't taken over the streaming slot.
            setStreamingChatId((cur) => (cur === chatId ? null : cur));
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
        <div className="flex min-h-0 flex-1 flex-col">
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
                        {editingChatId === chat.id ? (
                            <input
                                autoFocus
                                value={editingTitle}
                                maxLength={255}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") saveRename(chat.id);
                                    if (e.key === "Escape") setEditingChatId(null);
                                }}
                                onBlur={() => saveRename(chat.id)}
                                className="min-w-0 flex-1 rounded-lg border border-primary/30 bg-background
                                px-3 py-2 text-sm text-secondary outline-none focus:border-primary"
                            />
                        ) : (
                            <button
                                type="button"
                                onClick={() => openChat(chat.id)}
                                className="flex min-w-0 flex-1 flex-col items-start gap-0.5 px-3 py-2.5 text-left"
                            >
                                <span className="w-full truncate text-sm font-medium">{chat.title}</span>
                                <span className="text-xs text-description">{formatDay(chat.updatedAt)}</span>
                            </button>
                        )}
                        {editingChatId === chat.id ? (
                            <button
                                type="button"
                                aria-label={t("SaveTitle")}
                                title={t("SaveTitle")}
                                // onMouseDown (not onClick) so it fires before the input's onBlur.
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    saveRename(chat.id);
                                }}
                                className="mr-1 rounded-lg p-2 text-primary hover:bg-primary/10"
                            >
                                <Check size={16} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                aria-label={t("RenameChat")}
                                title={t("RenameChat")}
                                onClick={() => startRename(chat)}
                                className="rounded-lg p-2 text-description transition-colors duration-150 hover:text-primary"
                            >
                                <Pencil size={15} />
                            </button>
                        )}
                        <button
                            type="button"
                            aria-label={t("DeleteChat")}
                            title={t("DeleteChat")}
                            onClick={() => setConfirm({ kind: "chat", chat })}
                            className="mr-2 rounded-lg p-2 text-description transition-colors duration-150 hover:text-error"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
            {chats.length > 0 && (
                <button
                    type="button"
                    onClick={() => setConfirm({ kind: "all" })}
                    className="m-2 flex items-center justify-center gap-2 rounded-xl border border-primary/15
                    px-3 py-2 text-sm text-description transition-colors duration-150 hover:text-error"
                >
                    <Trash2 size={15} />
                    {t("ClearAllChats")}
                </button>
            )}
        </div>
    );

    const confirmDialog = confirm && (
        <Modal isOpen onClose={() => setConfirm(null)} labelledBy="agent-confirm-title" className="max-w-sm">
            <h2 id="agent-confirm-title" className="text-lg font-semibold">
                {confirm.kind === "all" ? t("ClearAllChats") : t("DeleteChat")}
            </h2>
            <p className="mt-2 text-sm text-description">
                {confirm.kind === "all"
                    ? t("ClearAllChatsConfirm")
                    : t("DeleteChatConfirm", { title: confirm.chat.title })}
            </p>
            <div className="mt-5 flex justify-end gap-2">
                <button
                    type="button"
                    onClick={() => setConfirm(null)}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-secondary hover:bg-primary/10"
                >
                    {t("Cancel")}
                </button>
                <button
                    type="button"
                    autoFocus
                    onClick={runConfirm}
                    className="rounded-xl bg-error px-4 py-2 text-sm font-semibold text-white
                    transition-transform duration-150 hover:scale-105"
                >
                    {t("Delete")}
                </button>
            </div>
        </Modal>
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
                                : "lg:inset-auto lg:bottom-6 lg:right-6 lg:h-[min(720px,calc(100vh-48px))] lg:w-[440px]"
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
                                                        ? message.segments[0]?.text
                                                        : <AgentSegments segments={message.segments} />}
                                                </motion.div>
                                            ))}
                                            {isSending && (
                                                <div className={`self-start rounded-2xl rounded-bl-md border
                                                border-primary/10 bg-primary/5 ${
                                                    streamSegments.length > 0 ? "max-w-[88%] px-3.5 py-2.5 text-[15px] leading-relaxed" : "max-w-[75%]"
                                                }`}
                                                    aria-label={t("AgentThinking")}
                                                >
                                                    {streamSegments.length > 0
                                                        ? <AgentSegments segments={streamSegments} />
                                                        : <TypingDots />}
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
                                                // Scrollbar only once the cap is hit — otherwise the
                                                // 1-row placeholder shows a phantom scroll.
                                                e.target.style.overflowY =
                                                    e.target.scrollHeight > 128 ? "auto" : "hidden";
                                            }}
                                            onKeyDown={onInputKeyDown}
                                            placeholder={t("AgentInputPlaceholder")}
                                            maxLength={4000}
                                            className="max-h-32 flex-1 resize-none overflow-y-hidden rounded-2xl
                                            border border-primary/25 bg-background px-4 py-2.5 text-[15px]
                                            text-secondary outline-none placeholder:text-placeholder
                                            focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                    {confirmDialog}
                </>
            )}
        </AnimatePresence>
    );
}

export default AgentPanel;
