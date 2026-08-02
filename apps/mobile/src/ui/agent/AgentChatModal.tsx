import { useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Check,
  History,
  Maximize2,
  Minimize2,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react-native';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import IconTile from '../IconTile';
import AgentSegments from './AgentSegments';
import type { AgentChatState } from './useAgentChat';

// The agent links web-canonical routes; the mobile dashboard lives at '/'.
const WEB_TO_MOBILE_ROUTE: Record<string, string> = { '/dashboard': '/' };

// Altura da sheet no mockup: quase a tela toda, mas com a faixa de cima ainda
// visível — o usuário nunca perde de vista de onde veio.
const SHEET_HEIGHT = '86%';

interface AgentChatModalProps {
  visible: boolean;
  onClose: () => void;
  chat: AgentChatState;
}

/**
 * Chat surface behind the bottom bar's centre button: a sheet at 86% of the
 * screen (expandable to full height). Two panes: the thread and the
 * conversation history. State lives in useAgentChat (held by AgentWidget),
 * so dismissing the sheet never loses the conversation.
 */
export default function AgentChatModal({ visible, onClose, chat }: AgentChatModalProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useBeyouTheme();
  const insets = useContext(SafeAreaInsetsContext);
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [pane, setPane] = useState<'thread' | 'history'>('thread');
  const [expanded, setExpanded] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  // Agent-suggested in-app link: the sheet covers the screen, so close first.
  const goToPage = (path: string) => {
    onClose();
    router.push((WEB_TO_MOBILE_ROUTE[path] ?? path) as never);
  };

  const {
    chats, activeChat, activeChatId, messages, streamSegments, input, setInput,
    isSending, openChat, startNewChat, removeChat, renameChat, clearAllChats, send,
  } = chat;

  const submitRename = (chatId: string) => {
    const title = editingTitle;
    setEditingChatId(null);
    renameChat(chatId, title);
  };

  const confirmClearAll = () => {
    Alert.alert(t('ClearAllChats'), t('ClearAllChatsConfirm'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Delete'), style: 'destructive', onPress: () => clearAllChats() },
    ]);
  };

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
  const headerButton = 'h-9 w-9 items-center justify-center rounded-control active:bg-surface-2';
  // O assunto da conversa em mono, sob o nome do assistente (mockup): é dado,
  // não título — a mono é o que separa os dois de relance.
  const subject = pane === 'history' ? t('AgentChats') : activeChat?.title;

  return (
    <Modal
      visible
      transparent
      // Sem slide sob `prefers-reduced-motion`: a sheet aparece em fade.
      animationType={reduceMotion ? 'fade' : 'slide'}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView behavior="padding" className="flex-1 justify-end">
        <Pressable
          accessibilityLabel={t('CloseAssistant')}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
          className="bg-black/40"
          testID="agent-backdrop"
        />
        <View
          testID="agent-sheet"
          className={`overflow-hidden border-t border-border bg-surface ${
            expanded ? '' : 'rounded-t-frame'
          }`}
          style={{
            height: expanded ? '100%' : SHEET_HEIGHT,
            paddingTop: expanded ? insets?.top ?? 0 : 0,
            paddingBottom: insets?.bottom ?? 0,
          }}
        >
          {/* Puxador: diz "isto é uma sheet" antes de qualquer gesto. */}
          {!expanded && (
            <View className="items-center pt-2" aria-hidden>
              <View className="h-1 w-10 rounded-full bg-border" />
            </View>
          )}

          {/* Header */}
          <View className="flex-row items-center gap-2 border-b border-border px-3 py-2.5">
            {pane === 'history' ? (
              <Pressable
                accessibilityLabel={t('CloseHistory')}
                onPress={() => setPane('thread')}
                className={headerButton}
                testID="agent-history-back"
              >
                <ArrowLeft size={20} color={theme.text2} />
              </Pressable>
            ) : (
              <IconTile size={32}>
                <Sparkles size={16} color={theme.accent} />
              </IconTile>
            )}
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-sm font-semibold text-text">
                {t('AiAssistant')}
              </Text>
              {subject ? (
                <Text numberOfLines={1} className="font-mono text-[10.5px] text-text-3">
                  {subject}
                </Text>
              ) : null}
            </View>

            {pane === 'thread' && (
              <Pressable
                accessibilityLabel={t('ChatHistory')}
                onPress={() => setPane('history')}
                className={headerButton}
                testID="agent-history"
              >
                <History size={19} color={theme.text2} />
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
              <Plus size={20} color={theme.text2} />
            </Pressable>
            <Pressable
              accessibilityLabel={expanded ? t('Collapse') : t('Expand')}
              accessibilityState={{ expanded }}
              onPress={() => setExpanded((current) => !current)}
              className={headerButton}
              testID="agent-expand"
            >
              {expanded ? (
                <Minimize2 size={18} color={theme.text2} />
              ) : (
                <Maximize2 size={18} color={theme.text2} />
              )}
            </Pressable>
            <Pressable
              accessibilityLabel={t('CloseAssistant')}
              onPress={onClose}
              className={headerButton}
              testID="agent-close"
            >
              <X size={20} color={theme.text2} />
            </Pressable>
          </View>

          {pane === 'history' ? (
            <View className="flex-1">
              <ScrollView className="flex-1 p-2">
                {chats.length === 0 && (
                  <Text className="px-3 py-6 text-center text-sm text-text-2">
                    {t('NoChatsYet')}
                  </Text>
                )}
                {chats.map((item) => (
                  <View
                    key={item.id}
                    className={`flex-row items-center rounded-card ${
                      item.id === activeChatId ? 'bg-accent-soft' : ''
                    }`}
                  >
                    {editingChatId === item.id ? (
                      <TextInput
                        autoFocus
                        value={editingTitle}
                        onChangeText={setEditingTitle}
                        maxLength={255}
                        onSubmitEditing={() => submitRename(item.id)}
                        onBlur={() => submitRename(item.id)}
                        className="min-w-0 flex-1 rounded-control border border-border bg-surface px-3 py-2 text-sm text-text"
                        testID={`agent-rename-input-${item.id}`}
                      />
                    ) : (
                      <Pressable
                        onPress={() => {
                          openChat(item.id);
                          setPane('thread');
                        }}
                        className="min-w-0 flex-1 px-3 py-3"
                      >
                        <Text numberOfLines={1} className="text-sm font-medium text-text">
                          {item.title}
                        </Text>
                        <Text className="font-mono text-[11px] text-text-3">
                          {formatDay(item.updatedAt)}
                        </Text>
                      </Pressable>
                    )}
                    {editingChatId === item.id ? (
                      <Pressable
                        accessibilityLabel={t('SaveTitle')}
                        onPress={() => submitRename(item.id)}
                        className="mr-1 h-9 w-9 items-center justify-center rounded-control"
                      >
                        <Check size={17} color={theme.accent} />
                      </Pressable>
                    ) : (
                      <Pressable
                        accessibilityLabel={t('RenameChat')}
                        onPress={() => {
                          setEditingChatId(item.id);
                          setEditingTitle(item.title);
                        }}
                        className="h-9 w-9 items-center justify-center rounded-control"
                        testID={`agent-rename-${item.id}`}
                      >
                        <Pencil size={15} color={theme.text3} />
                      </Pressable>
                    )}
                    <Pressable
                      accessibilityLabel={t('DeleteChat')}
                      onPress={() => confirmDelete(item.id, item.title)}
                      className="mr-1 h-9 w-9 items-center justify-center rounded-control"
                      testID={`agent-delete-${item.id}`}
                    >
                      <Trash2 size={16} color={theme.text3} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
              {chats.length > 0 && (
                <Pressable
                  accessibilityLabel={t('ClearAllChats')}
                  onPress={confirmClearAll}
                  className="m-2 flex-row items-center justify-center gap-2 rounded-card border border-border px-3 py-2.5 active:bg-danger/10"
                  testID="agent-clear-all"
                >
                  <Trash2 size={15} color={theme.danger} />
                  <Text className="text-sm text-danger">{t('ClearAllChats')}</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <>
              {/* Messages / empty state */}
              {messages.length === 0 && !isSending ? (
                <View className="flex-1 items-center justify-center gap-3 px-6">
                  <IconTile size={56}>
                    <Sparkles size={24} color={theme.accent} />
                  </IconTile>
                  <Text className="text-center text-xl font-semibold text-text">
                    {t('AgentEmptyTitle')}
                  </Text>
                  <Text className="text-center text-sm text-text-2">
                    {t('AgentEmptySubtitle')}
                  </Text>
                  <View className="mt-1 flex-row flex-wrap justify-center gap-2">
                    {suggestions.map((suggestion) => (
                      <Pressable
                        key={suggestion}
                        onPress={() => send(suggestion)}
                        accessibilityRole="button"
                        className="rounded-full border border-border px-3.5 py-1.5 active:bg-surface-2"
                      >
                        <Text className="text-sm text-text-2">{suggestion}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : (
                <ScrollView
                  ref={scrollRef}
                  className="flex-1 px-3"
                  contentContainerStyle={{ paddingVertical: 16, gap: 10 }}
                  onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: !reduceMotion })}
                >
                  {messages.map((message, index) =>
                    message.role === 'USER' ? (
                      <View
                        key={`${index}-u`}
                        className="max-w-[88%] self-end rounded-card rounded-br-md bg-accent px-3.5 py-2.5"
                      >
                        <Text className="text-[15px] leading-[22px] text-on-accent">
                          {message.segments[0]?.text}
                        </Text>
                      </View>
                    ) : (
                      <View
                        key={`${index}-a`}
                        className="max-w-[92%] self-start rounded-card rounded-bl-md bg-surface-2 px-3.5 py-2.5"
                      >
                        <AgentSegments segments={message.segments} onInternalLink={goToPage} />
                      </View>
                    ),
                  )}
                  {isSending && (
                    <View
                      accessibilityLabel={t('AgentThinking')}
                      className={`max-w-[92%] self-start rounded-card rounded-bl-md bg-surface-2 ${
                        streamSegments.length > 0 ? 'px-3.5 py-2.5' : 'px-4 py-3'
                      }`}
                    >
                      {streamSegments.length > 0 ? (
                        <>
                          <AgentSegments segments={streamSegments} onInternalLink={goToPage} />
                          {/* Still streaming: keep a small spinner under the growing reply. */}
                          <ActivityIndicator
                            size="small"
                            color={theme.accent}
                            style={{ marginTop: 8, alignSelf: 'flex-start' }}
                          />
                        </>
                      ) : (
                        <ActivityIndicator size="small" color={theme.accent} />
                      )}
                    </View>
                  )}
                </ScrollView>
              )}

              {/* Composer */}
              <View className="flex-row items-end gap-2 border-t border-border p-2.5">
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  placeholder={t('AgentInputPlaceholder')}
                  placeholderTextColor={theme.text3}
                  multiline
                  maxLength={4000}
                  className="max-h-32 flex-1 rounded-card border border-border bg-bg px-4 py-2.5 text-[15px] text-text"
                  testID="agent-input"
                />
                <Pressable
                  accessibilityLabel={t('AgentSend')}
                  onPress={() => send()}
                  disabled={!input.trim() || isSending}
                  className={`h-10 w-10 items-center justify-center rounded-full bg-accent ${
                    !input.trim() || isSending ? 'opacity-40' : 'active:opacity-80'
                  }`}
                  testID="agent-send"
                >
                  <Send size={17} color={theme.onAccent} />
                </Pressable>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
