import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { FileText, Layers, Lightbulb, Send, Trash2 } from 'lucide-react-native';
import { appendDiagramToPage, appendToPage, askStudyQuestion, clearStudyChat, generateCards } from '@beyou/api/notebook';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { enterNotebookPage } from '@beyou/state';
import type { ChatMessage, Citation } from '@beyou/types/notebook/notebook';
import AgentMarkdown from '../../ui/agent/AgentMarkdown';
import DeleteModal from '../../ui/DeleteModal';
import DiagramCard from '../diagram/DiagramCard';
import { notify } from '../../notify';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import type { AppDispatch } from '../../store';

/**
 * Markdown from the study AI as the phone's markdown view reads it: that view has no headings, so
 * a heading line becomes a bold one rather than showing its #s.
 */
export function studyMarkdown(markdown: string): string {
  return markdown.replace(/^#{1,6}\s+(.+)$/gm, '**$1**');
}

/**
 * The study room's conversation on the phone: questions about this page, answered from its notes
 * and the sources it reads, each point numbered back to where it came from, listed under the
 * answer. An answer can be saved to the end of the page, or turned into cards. An answer the tutor
 * drew a diagram for carries it as a card under the text, with its own "Save to page".
 */
export default function StudyChat({
  pageId,
  initialMessages,
  onCardsMade,
}: {
  pageId: string;
  initialMessages: ChatMessage[];
  onCardsMade: () => void;
}) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const dispatch = useDispatch<AppDispatch>();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => setMessages(initialMessages), [initialMessages]);

  const ask = async () => {
    const text = input.trim();
    if (!text || pending) return;
    setPending(text);
    setInput('');
    const response = await askStudyQuestion(pageId, text, t);
    setPending(null);
    if (response.success) {
      setMessages((current) => [...current, response.success!.question, response.success!.answer]);
    } else {
      notify.error(getFriendlyErrorMessage(t, response.error));
      setInput(text);
    }
  };

  const saveToPage = async (message: ChatMessage) => {
    setBusy(`save-${message.id}`);
    const response = await appendToPage(pageId, message.content, t);
    setBusy(null);
    if (response.success) notify.success(t('NotebookStudySavedToPage'));
    else notify.error(getFriendlyErrorMessage(t, response.error));
  };

  /**
   * The answer's diagram, appended to the page as a diagram block. The server answers with the
   * page, which goes into the store so the page screen behind shows the block at once.
   */
  const saveDiagram = async (message: ChatMessage) => {
    if (!message.diagram) return;
    setBusy(`diagram-${message.id}`);
    const response = await appendDiagramToPage(pageId, message.diagram, t);
    setBusy(null);
    if (response.success) {
      dispatch(enterNotebookPage(response.success));
      notify.success(t('DiagramSaved', { title: response.success.title }));
    } else {
      notify.error(getFriendlyErrorMessage(t, response.error));
    }
  };

  const makeCards = async (message: ChatMessage) => {
    setBusy(`cards-${message.id}`);
    const response = await generateCards(pageId, { text: message.content, count: 3 }, t);
    setBusy(null);
    if (!response.success) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    notify.success(t('NotebookStudyCardsMade', { count: response.success.length }));
    onCardsMade();
  };

  const clear = async () => {
    const response = await clearStudyChat(pageId, t);
    setConfirmClear(false);
    if (response.error) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    setMessages([]);
  };

  return (
    <View className="flex-1">
      <ScrollView
        ref={scroll}
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        testID="study-chat"
      >
        {messages.length === 0 && !pending ? (
          <Text className="text-center text-[14px] leading-5 text-text-2" testID="study-chat-empty">
            {t('NotebookStudyChatEmpty')}
          </Text>
        ) : null}
        {messages.length > 0 ? (
          <Pressable
            onPress={() => setConfirmClear(true)}
            accessibilityRole="button"
            className="h-9 flex-row items-center gap-1.5 self-end px-2"
            testID="study-chat-clear"
          >
            <Trash2 size={14} color={theme.text3} />
            <Text className="text-[12.5px] text-text-3">{t('NotebookStudyClearChat')}</Text>
          </Pressable>
        ) : null}
        {messages.map((message) =>
          message.role === 'USER' ? (
            <View key={message.id} className="max-w-[82%] self-end rounded-2xl rounded-br-md bg-accent px-3.5 py-2.5" testID="study-question">
              <Text className="text-[14px] leading-5 text-on-accent">{message.content}</Text>
            </View>
          ) : (
            <View key={message.id} className="gap-2" testID="study-answer">
              <View className="max-w-[94%] gap-2.5 self-start rounded-2xl rounded-bl-md border border-border bg-surface px-3.5 py-3">
                <AgentMarkdown text={studyMarkdown(message.content)} />
                <View className="flex-row flex-wrap gap-1.5">
                  <ActionChip
                    Icon={FileText}
                    label={t('NotebookStudySaveToPage')}
                    busy={busy === `save-${message.id}`}
                    onPress={() => void saveToPage(message)}
                    testID="study-save-to-page"
                  />
                  <ActionChip
                    Icon={Layers}
                    label={t('NotebookStudyMakeCards')}
                    tint={theme.xp}
                    busy={busy === `cards-${message.id}`}
                    onPress={() => void makeCards(message)}
                    testID="study-make-cards"
                  />
                </View>
              </View>
              {message.diagram ? (
                <DiagramCard
                  spec={message.diagram}
                  source={message.citations.length > 0 ? 'notes' : 'ai'}
                  onSave={() => void saveDiagram(message)}
                  saving={busy === `diagram-${message.id}`}
                  testID="study-diagram"
                />
              ) : null}
              <Citations citations={message.citations} />
            </View>
          ),
        )}
        {pending ? (
          <>
            <View className="max-w-[82%] self-end rounded-2xl rounded-br-md bg-accent px-3.5 py-2.5">
              <Text className="text-[14px] leading-5 text-on-accent">{pending}</Text>
            </View>
            <View className="flex-row items-center gap-2 self-start px-1" testID="study-thinking">
              <ActivityIndicator size="small" color={theme.accent} />
              <Text className="text-[13px] text-text-2">{t('NotebookStudyThinking')}</Text>
            </View>
          </>
        ) : null}
      </ScrollView>

      <View className="flex-row items-center gap-2 border-t border-border bg-surface px-3 py-2.5">
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={t('NotebookStudyAskPlaceholder')}
          placeholderTextColor={theme.text3}
          accessibilityLabel={t('NotebookStudyAskPlaceholder')}
          multiline
          maxLength={2000}
          className="max-h-28 min-h-[46px] flex-1 rounded-[23px] border border-border bg-bg px-4 py-3 text-[14px] text-text"
          testID="study-input"
        />
        <Pressable
          onPress={() => void ask()}
          disabled={!input.trim() || !!pending}
          accessibilityRole="button"
          accessibilityLabel={t('NotebookStudySend')}
          className={`h-[46px] w-[46px] items-center justify-center rounded-full bg-accent ${!input.trim() || pending ? 'opacity-50' : ''}`}
          testID="study-send"
        >
          <Send size={18} color={theme.onAccent} />
        </Pressable>
      </View>

      <DeleteModal
        visible={confirmClear}
        deletePhrase={t('NotebookStudyClearChatTitle')}
        name={t('NotebookStudyChat')}
        detail={t('NotebookStudyClearChatBody')}
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => void clear()}
        testID="study-clear-modal"
      />
    </View>
  );
}

/**
 * Where each numbered point came from: the note or the source, and the page in a PDF. An answer
 * with none came from the tutor's own knowledge, and says so.
 */
function Citations({ citations }: { citations: Citation[] }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  if (citations.length === 0) {
    return (
      <View className="flex-row items-center gap-1.5 self-start rounded-full bg-surface-2 px-2.5 py-1" testID="study-answer-general">
        <Lightbulb size={12} color={theme.text2} />
        <Text className="text-[11.5px] font-semibold text-text-2">{t('NotebookStudyGeneralKnowledge')}</Text>
      </View>
    );
  }
  return (
    <View className="gap-1 px-1" testID="study-citations">
      {citations.map((citation) => (
        <Text key={citation.n} className="text-[12px] leading-[17px] text-text-2" numberOfLines={2}>
          <Text className="font-mono-semibold text-[11px] text-accent">{`${citation.n} `}</Text>
          {citation.pageNumber ? `${citation.title}, p. ${citation.pageNumber}` : citation.title}
        </Text>
      ))}
    </View>
  );
}

function ActionChip({
  Icon,
  label,
  tint,
  busy,
  onPress,
  testID,
}: {
  Icon: typeof FileText;
  label: string;
  tint?: string;
  busy: boolean;
  onPress: () => void;
  testID: string;
}) {
  const { theme } = useBeyouTheme();
  const color = tint ?? theme.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      className="h-9 flex-row items-center gap-1.5 rounded-[9px] border border-border bg-surface px-2.5"
      testID={testID}
    >
      {busy ? <ActivityIndicator size="small" color={color} /> : <Icon size={13} color={color} />}
      <Text className="text-[12px] font-semibold" style={{ color }}>{label}</Text>
    </Pressable>
  );
}
