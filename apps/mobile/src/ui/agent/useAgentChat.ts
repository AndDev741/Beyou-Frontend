import { useCallback, useRef, useState } from 'react';
import { usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { agentChat, agentMessage } from '@beyou/types/agent/chatType';
import {
  createAgentChat,
  deleteAgentChat,
  getAgentChats,
  getAgentMessages,
  sendAgentMessage,
} from '@beyou/api/agent/agentChats';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { notify } from '../../notify';

const VISIBLE_ROLES = ['USER', 'ASSISTANT'];
const AUTO_TITLE_MAX = 40;

/**
 * Chat state lives in this hook (held by AgentWidget, which never unmounts),
 * so closing the modal or navigating between screens keeps the conversation.
 */
export function useAgentChat() {
  const { t } = useTranslation();
  const pathname = usePathname();
  // Page context for the agent: web route names are the canonical ones the
  // prompt knows, and the mobile dashboard lives at '/'.
  const currentPageRef = useRef('/dashboard');
  currentPageRef.current = pathname === '/' ? '/dashboard' : pathname;
  const [chats, setChats] = useState<agentChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<agentMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const loadedRef = useRef(false);
  // Mirrors activeChatId for in-flight sends: if the user switches chats while
  // the agent is replying, the reply must NOT land in the newly opened thread.
  // Updated explicitly at every transition (state updates are async, so a
  // render-time mirror alone misses the create-chat-then-send path).
  const activeChatIdRef = useRef<string | null>(null);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

  const openChat = useCallback(
    async (chatId: string) => {
      setActiveChatId(chatId);
      activeChatIdRef.current = chatId;
      setMessages([]);
      const response = await getAgentMessages(chatId, t);
      if (response.success) {
        setMessages(response.success.filter((m) => VISIBLE_ROLES.includes(m.role)));
      } else {
        notify.error(getFriendlyErrorMessage(t, response.error));
      }
    },
    [t],
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
  }, []);

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
          return null;
        }
        return current;
      });
    },
    [t],
  );

  const send = useCallback(
    async (rawText?: string) => {
      const text = (rawText ?? input).trim();
      if (!text || isSending) return;

      setInput('');
      setIsSending(true);
      setMessages((prev) => [...prev, { role: 'USER', text }]);

      try {
        let chatId = activeChatId;
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

        const response = await sendAgentMessage(chatId, text, t, currentPageRef.current);
        // User may have switched chats mid-flight; the exchange is persisted
        // server-side and appears when the original chat is reopened — never
        // touch the visible thread of a different chat.
        const stillOnSameChat = activeChatIdRef.current === chatId;
        if (response.success) {
          if (stillOnSameChat) {
            setMessages((prev) => [...prev, { role: 'ASSISTANT', text: response.success as string }]);
          }
          setChats((prev) => {
            const current = prev.find((c) => c.id === chatId);
            if (!current) return prev;
            const bumped = { ...current, updatedAt: new Date().toISOString() };
            return [bumped, ...prev.filter((c) => c.id !== chatId)];
          });
        } else {
          notify.error(getFriendlyErrorMessage(t, response.error));
          if (stillOnSameChat) {
            setMessages((prev) => prev.slice(0, -1));
            setInput(text);
          }
        }
      } finally {
        setIsSending(false);
      }
    },
    [activeChatId, input, isSending, t],
  );

  return {
    chats,
    activeChat,
    activeChatId,
    messages,
    input,
    setInput,
    isSending,
    ensureLoaded,
    openChat,
    startNewChat,
    removeChat,
    send,
  };
}

export type AgentChatState = ReturnType<typeof useAgentChat>;
