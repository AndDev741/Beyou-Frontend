import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { agentChat, agentMessage, agentSegment } from '@beyou/types/agent/chatType';
import {
  createAgentChat,
  deleteAgentChat,
  deleteAllAgentChats,
  getAgentChats,
  getAgentMessages,
  renameAgentChat,
} from '@beyou/api/agent/agentChats';
import { streamAgentMessage } from '@beyou/api/agent/agentStream';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { notify } from '../../notify';
import { useAgentRefresh } from './useAgentRefresh';

const VISIBLE_ROLES = ['USER', 'ASSISTANT'];
const AUTO_TITLE_MAX = 40;

/**
 * Chat state lives in this hook (held by AgentWidget, which never unmounts),
 * so closing the modal or navigating between screens keeps the conversation.
 */
export function useAgentChat() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const refreshDomains = useAgentRefresh();
  // Page context for the agent: web route names are the canonical ones the
  // prompt knows, and the mobile dashboard lives at '/'.
  const currentPageRef = useRef('/dashboard');
  currentPageRef.current = pathname === '/' ? '/dashboard' : pathname;
  const [chats, setChats] = useState<agentChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<agentMessage[]>([]);
  const [input, setInput] = useState('');
  // Which chat currently has a stream in flight (null = none). Per-chat, so
  // switching away doesn't lock the composer or show a phantom thinking bubble.
  const [streamingChatId, setStreamingChatId] = useState<string | null>(null);
  // In-flight streaming reply: segments accumulate in a ref (cheap) and flush
  // to state on an animation frame — a setState per token would re-parse the
  // markdown tree dozens of times a second.
  const [streamSegments, setStreamSegments] = useState<agentSegment[]>([]);
  const streamSegmentsRef = useRef<agentSegment[]>([]);
  const rafRef = useRef<number | null>(null);
  // Cancels the in-flight fetch on chat switch / logout so the reader stops
  // and we stop paying for the LLM instead of firing setState after teardown.
  const abortRef = useRef<AbortController | null>(null);
  const loadedRef = useRef(false);
  // Mirrors activeChatId for in-flight sends: if the user switches chats while
  // the agent is replying, the reply must NOT land in the newly opened thread.
  // Updated explicitly at every transition (state updates are async, so a
  // render-time mirror alone misses the create-chat-then-send path).
  const activeChatIdRef = useRef<string | null>(null);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

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

  // Abort any in-flight stream when the widget tears down (e.g. logout).
  useEffect(() => () => abortRef.current?.abort(), []);

  // Live segment building, mirroring the backend AgentTurnBuilder: tokens
  // extend the trailing text run; a finished tool replaces its started chip.
  const appendToken = useCallback((token: string) => {
    const segs = streamSegmentsRef.current;
    const last = segs[segs.length - 1];
    if (last && last.type === 'text') {
      segs[segs.length - 1] = { ...last, text: (last.text ?? '') + token };
    } else {
      segs.push({ type: 'text', text: token });
    }
  }, []);

  const applyToolEvent = useCallback((tool: agentSegment) => {
    const segs = streamSegmentsRef.current;
    if (tool.status === 'started') {
      segs.push(tool);
      return;
    }
    for (let i = segs.length - 1; i >= 0; i--) {
      const seg = segs[i];
      if (seg.type === 'tool' && seg.tool === tool.tool && seg.status === 'started') {
        segs[i] = tool;
        return;
      }
    }
    segs.push(tool);
  }, []);

  const openChat = useCallback(
    async (chatId: string) => {
      setActiveChatId(chatId);
      activeChatIdRef.current = chatId;
      setMessages([]);
      clearStreaming();
      const response = await getAgentMessages(chatId, t);
      if (response.success) {
        setMessages(response.success.filter((m) => VISIBLE_ROLES.includes(m.role)));
      } else {
        notify.error(getFriendlyErrorMessage(t, response.error));
      }
    },
    [t, clearStreaming],
  );

  /** First open only: load the list and resume the most recent conversation. */
  const ensureLoaded = useCallback(async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const response = await getAgentChats(t);
    if (!response.success) {
      loadedRef.current = false;
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    setChats(response.success);
    if (response.success.length > 0) openChat(response.success[0].id);
  }, [t, openChat]);

  const startNewChat = useCallback(() => {
    // No server round-trip: the chat row is only created with the first message.
    setActiveChatId(null);
    activeChatIdRef.current = null;
    setMessages([]);
    clearStreaming();
  }, [clearStreaming]);

  const removeChat = useCallback(
    async (chatId: string) => {
      const response = await deleteAgentChat(chatId, t);
      if (response.error) {
        notify.error(getFriendlyErrorMessage(t, response.error));
        return;
      }
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      setActiveChatId((current) => {
        if (current === chatId) {
          activeChatIdRef.current = null;
          setMessages([]);
          clearStreaming();
          return null;
        }
        return current;
      });
    },
    [t, clearStreaming],
  );

  const renameChat = useCallback(
    async (chatId: string, rawTitle: string) => {
      const title = rawTitle.trim();
      const current = chats.find((c) => c.id === chatId);
      if (!title || title === current?.title) return;
      const response = await renameAgentChat(chatId, title, t);
      if (response.error) {
        notify.error(getFriendlyErrorMessage(t, response.error));
        return;
      }
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title } : c)));
    },
    [chats, t],
  );

  /** Reset the agent: delete all chats + clear its remembered context. */
  const clearAllChats = useCallback(async () => {
    const response = await deleteAllAgentChats(t);
    if (response.error) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    setChats([]);
    setActiveChatId(null);
    activeChatIdRef.current = null;
    setMessages([]);
    clearStreaming();
    notify.success(t('ClearAllChatsDone'));
  }, [t, clearStreaming]);

  const isSending = streamingChatId !== null && streamingChatId === activeChatId;

  const send = useCallback(
    async (rawText?: string) => {
      const text = (rawText ?? input).trim();
      // Guard on the VIEWED chat's stream, computed here (not the stale closure).
      const viewedIsStreaming = streamingChatId !== null && streamingChatId === activeChatIdRef.current;
      if (!text || viewedIsStreaming) return;

      setInput('');
      setMessages((prev) => [...prev, { role: 'USER', segments: [{ type: 'text', text }] }]);

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
            notify.error(getFriendlyErrorMessage(t, created.error));
            setMessages((prev) => prev.slice(0, -1));
            return;
          }
          chatId = created.success.id;
          setActiveChatId(chatId);
          activeChatIdRef.current = chatId;
          setChats((prev) => [created.success as agentChat, ...prev]);
        }
        setStreamingChatId(chatId);

        // User may switch chats mid-stream; the exchange is persisted
        // server-side and appears when the original chat is reopened — never
        // touch the visible thread of a different chat.
        const onThisChat = () => activeChatIdRef.current === chatId;
        const bumpChat = () =>
          setChats((prev) => {
            const current = prev.find((c) => c.id === chatId);
            if (!current) return prev;
            const bumped = { ...current, updatedAt: new Date().toISOString() };
            return [bumped, ...prev.filter((c) => c.id !== chatId)];
          });

        await streamAgentMessage(
          chatId,
          text,
          {
            onToken: (token) => {
              if (!onThisChat()) return;
              appendToken(token);
              scheduleStreamFlush();
            },
            onTool: (event) => {
              if (!onThisChat()) return;
              applyToolEvent({
                type: 'tool',
                tool: event.tool,
                status: event.status,
                error: event.error,
                domains: event.domains,
              });
              scheduleStreamFlush();
            },
            onDone: (segments) => {
              if (onThisChat()) {
                setMessages((prev) => [...prev, { role: 'ASSISTANT', segments }]);
                clearStreaming();
              }
              bumpChat();
              const domains = segments.flatMap((s) => (s.type === 'tool' ? s.domains ?? [] : []));
              if (domains.length) refreshDomains(domains);
            },
            onError: (errorKey) => {
              if (!onThisChat()) return;
              notify.error(t(errorKey, { defaultValue: t('UnexpectedError') }));
              clearStreaming();
              setMessages((prev) => prev.slice(0, -1));
              setInput(text);
            },
          },
          currentPageRef.current,
          controller.signal,
        );
      } finally {
        // Clear only if a newer send hasn't taken over the streaming slot.
        setStreamingChatId((cur) => (cur === chatId ? null : cur));
      }
    },
    [activeChatId, input, streamingChatId, t, appendToken, applyToolEvent, scheduleStreamFlush, clearStreaming, refreshDomains],
  );

  return {
    chats,
    activeChat,
    activeChatId,
    messages,
    streamSegments,
    input,
    setInput,
    isSending,
    ensureLoaded,
    openChat,
    startNewChat,
    removeChat,
    renameChat,
    clearAllChats,
    send,
  };
}

export type AgentChatState = ReturnType<typeof useAgentChat>;
