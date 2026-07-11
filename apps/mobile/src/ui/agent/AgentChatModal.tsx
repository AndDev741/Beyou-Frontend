import { useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, History, Plus, Send, Sparkles, Trash2, X } from 'lucide-react-native';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import AgentMarkdown from './AgentMarkdown';
import type { AgentChatState } from './useAgentChat';

interface AgentChatModalProps {
  visible: boolean;
  onClose: () => void;
  chat: AgentChatState;
}

/**
 * Fullscreen chat surface behind the FAB. Two panes: the thread and the
 * conversation history. State lives in useAgentChat (held by AgentWidget),
 * so dismissing the modal never loses the conversation.
 */
export default function AgentChatModal({ visible, onClose, chat }: AgentChatModalProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useBeyouTheme();
  const insets = useContext(SafeAreaInsetsContext);
  const [pane, setPane] = useState<'thread' | 'history'>('thread');
  const scrollRef = useRef<ScrollView>(null);

  const {
    chats, activeChat, activeChatId, messages, input, setInput,
    isSending, openChat, startNewChat, removeChat, send,
  } = chat;

  useEffect(() => {
    if (visible) setPane('thread');
  }, [visible]);

  // RN Modal mounts children even when hidden (and always under jest) — the
  // early return keeps the hidden tree out and closed-modal tests deterministic.
  if (!visible) return null;

  const formatDay = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short' });

  const confirmDelete = (chatId: string, title: string) => {
    Alert.alert(t('DeleteChat'), title, [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Delete'), style: 'destructive', onPress: () => removeChat(chatId) },
    ]);
  };

  const suggestions = [t('AgentSuggestion1'), t('AgentSuggestion2'), t('AgentSuggestion3')];
  const headerButton = 'h-9 w-9 items-center justify-center rounded-lg active:bg-primary/10';

  return (
    <Modal visible transparent={false} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-background"
        style={{ paddingTop: insets?.top ?? 0, paddingBottom: insets?.bottom ?? 0 }}
      >
        {/* Header */}
        <View className="flex-row items-center gap-2 border-b border-primary/10 px-3 py-2.5">
          {pane === 'history' ? (
            <Pressable
              accessibilityLabel={t('CloseHistory')}
              onPress={() => setPane('thread')}
              className={headerButton}
              testID="agent-history-back"
            >
              <ArrowLeft size={20} color={theme.secondary} />
            </Pressable>
          ) : (
            <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Sparkles size={16} color={theme.primary} />
            </View>
          )}
          <Text numberOfLines={1} className="min-w-0 flex-1 font-semibold text-secondary">
            {pane === 'history' ? t('AgentChats') : activeChat ? activeChat.title : t('AiAssistant')}
          </Text>

          {pane === 'thread' && (
            <Pressable
              accessibilityLabel={t('ChatHistory')}
              onPress={() => setPane('history')}
              className={headerButton}
              testID="agent-history"
            >
              <History size={19} color={theme.secondary} />
            </Pressable>
          )}
          <Pressable
            accessibilityLabel={t('NewChat')}
            onPress={() => {
              startNewChat();
              setPane('thread');
            }}
            className={headerButton}
            testID="agent-new-chat"
          >
            <Plus size={20} color={theme.secondary} />
          </Pressable>
          <Pressable
            accessibilityLabel={t('CloseAssistant')}
            onPress={onClose}
            className={headerButton}
            testID="agent-close"
          >
            <X size={20} color={theme.secondary} />
          </Pressable>
        </View>

        {pane === 'history' ? (
          <ScrollView className="flex-1 p-2">
            {chats.length === 0 && (
              <Text className="px-3 py-6 text-center text-sm text-description">
                {t('NoChatsYet')}
              </Text>
            )}
            {chats.map((item) => (
              <View
                key={item.id}
                className={`flex-row items-center rounded-xl ${
                  item.id === activeChatId ? 'bg-primary/10' : ''
                }`}
              >
                <Pressable
                  onPress={() => {
                    openChat(item.id);
                    setPane('thread');
                  }}
                  className="min-w-0 flex-1 px-3 py-3"
                >
                  <Text numberOfLines={1} className="text-sm font-medium text-secondary">
                    {item.title}
                  </Text>
                  <Text className="text-xs text-description">{formatDay(item.updatedAt)}</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={t('DeleteChat')}
                  onPress={() => confirmDelete(item.id, item.title)}
                  className="mr-1 h-9 w-9 items-center justify-center rounded-lg"
                  testID={`agent-delete-${item.id}`}
                >
                  <Trash2 size={16} color={theme.description} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : (
          <>
            {/* Messages / empty state */}
            {messages.length === 0 && !isSending ? (
              <View className="flex-1 items-center justify-center gap-3 px-6">
                <View className="h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles size={24} color={theme.primary} />
                </View>
                <Text className="text-center text-xl font-semibold text-secondary">
                  {t('AgentEmptyTitle')}
                </Text>
                <Text className="text-center text-sm text-description">
                  {t('AgentEmptySubtitle')}
                </Text>
                <View className="mt-1 flex-row flex-wrap justify-center gap-2">
                  {suggestions.map((suggestion) => (
                    <Pressable
                      key={suggestion}
                      onPress={() => send(suggestion)}
                      className="rounded-full border border-primary/30 px-3.5 py-1.5 active:bg-primary/10"
                    >
                      <Text className="text-sm text-secondary">{suggestion}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              <ScrollView
                ref={scrollRef}
                className="flex-1 px-3"
                contentContainerStyle={{ paddingVertical: 16, gap: 10 }}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
              >
                {messages.map((message, index) =>
                  message.role === 'USER' ? (
                    <View
                      key={`${index}-u`}
                      className="max-w-[88%] self-end rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5"
                    >
                      <Text className="text-[15px] leading-[22px] text-white">{message.text}</Text>
                    </View>
                  ) : (
                    <View
                      key={`${index}-a`}
                      className="max-w-[88%] self-start rounded-2xl rounded-bl-md border border-primary/10 bg-primary/5 px-3.5 py-2.5"
                    >
                      <AgentMarkdown text={message.text} />
                    </View>
                  ),
                )}
                {isSending && (
                  <View
                    accessibilityLabel={t('AgentThinking')}
                    className="max-w-[75%] self-start rounded-2xl rounded-bl-md border border-primary/10 bg-primary/5 px-4 py-3"
                  >
                    <ActivityIndicator size="small" color={theme.primary} />
                  </View>
                )}
              </ScrollView>
            )}

            {/* Composer */}
            <View className="flex-row items-end gap-2 border-t border-primary/10 p-2.5">
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder={t('AgentInputPlaceholder')}
                placeholderTextColor={theme.placeholder}
                multiline
                maxLength={4000}
                className="max-h-32 flex-1 rounded-2xl border border-primary/25 bg-background px-4 py-2.5 text-[15px] text-secondary"
                testID="agent-input"
              />
              <Pressable
                accessibilityLabel={t('AgentSend')}
                onPress={() => send()}
                disabled={!input.trim() || isSending}
                className={`h-11 w-11 items-center justify-center rounded-full bg-primary ${
                  !input.trim() || isSending ? 'opacity-40' : 'active:opacity-80'
                }`}
                testID="agent-send"
              >
                <Send size={18} color="#ffffff" />
              </Pressable>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}
