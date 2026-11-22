import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, ChevronLeft, ChevronRight, MessageCircleQuestionMark, Sparkles } from 'lucide-react-native';
import { SECOND_BRAIN_QUESTION_LABEL, canActOnAnswer } from '@beyou/state';
import {
  SECOND_BRAIN_ANSWER_MAX,
  type SecondBrainAnswerResult,
  type SecondBrainQuestion,
} from '@beyou/types/secondBrain/secondBrain';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import EmptyState from '../ui/EmptyState';
import IconButton from '../ui/IconButton';
import Input from '../ui/Input';
import { openAgentPanelWithDraft } from '../ui/agent/agentPanelBus';
import { useBeyouTheme } from '../theme/ThemeProvider';
import Block, { Shimmer } from './Block';

type QuestionsBlockProps = {
  /** Open questions, oldest first. */
  questions: SecondBrainQuestion[];
  /** True while the server is deciding what to ask next. */
  refilling: boolean;
  /**
   * False while onboarding runs: the assistant does not open then (see AgentWidget), and
   * a button that opens nothing would be noise.
   */
  canHandOver: boolean;
  /** Resolves with what the answer taught, or null when saving failed (the caller toasts). */
  onAnswer: (id: string, answer: string) => Promise<SecondBrainAnswerResult | null>;
  onSkip: (id: string) => Promise<boolean>;
  onRefill: () => void;
};

/**
 * The interview, one question at a time.
 *
 * One at a time on purpose: a list of five reads as a form to fill in, and a form gets
 * postponed. A single question with a box under it gets answered.
 *
 * After an answer the block shows what was kept (profile lines, notes on things), and for a
 * question about the day or about something in progress it offers to hand the answer to the
 * assistant, which is the part of Beyou that can check items, move habits and delete tasks.
 * The hand-off only fills the assistant's input. Nothing changes until the person sends it.
 */
export default function QuestionsBlock({
  questions,
  refilling,
  canHandOver,
  onAnswer,
  onSkip,
  onRefill,
}: QuestionsBlockProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();

  const [index, setIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'answer' | 'skip' | null>(null);
  const [result, setResult] = useState<SecondBrainAnswerResult | null>(null);

  // The list shrinks under the cursor when a question is answered or skipped.
  useEffect(() => {
    if (index > 0 && index >= questions.length) setIndex(Math.max(0, questions.length - 1));
  }, [index, questions.length]);

  const position = Math.min(index, questions.length - 1);
  const current = questions[position];
  const draft = current ? (drafts[current.id] ?? '') : '';
  const trimmed = draft.trim();

  const forget = (id: string) => setDrafts(({ [id]: _dropped, ...rest }) => rest);

  const submit = async () => {
    if (!current || !trimmed || busy) return;
    setBusy('answer');
    const outcome = await onAnswer(current.id, trimmed);
    setBusy(null);
    if (!outcome) return;
    forget(current.id);
    setResult(outcome);
  };

  const skip = async () => {
    if (!current || busy) return;
    setBusy('skip');
    const ok = await onSkip(current.id);
    setBusy(null);
    if (ok) forget(current.id);
  };

  const handOver = () => {
    if (!result) return;
    openAgentPanelWithDraft(
      t('SecondBrainActOnItDraft', {
        question: result.question.text,
        answer: result.question.answer ?? '',
        interpolation: { escapeValue: false },
      }),
    );
  };

  // The pager rides in the header on the phone: a row of two buttons under the answer box
  // has no room left for it at 360 points.
  const pager =
    !result && questions.length > 1 ? (
      <View className="flex-row items-center gap-1">
        <IconButton
          label={t('SecondBrainQuestionPrevious')}
          onPress={() => setIndex(Math.max(0, position - 1))}
          disabled={position === 0}
          testID="second-brain-question-previous"
        >
          <ChevronLeft size={18} color={theme.text2} />
        </IconButton>
        <Text className="font-mono text-xs text-text-2" testID="second-brain-question-count">
          {t('SecondBrainQuestionCount', { current: position + 1, total: questions.length })}
        </Text>
        <IconButton
          label={t('SecondBrainQuestionNext')}
          onPress={() => setIndex(Math.min(questions.length - 1, position + 1))}
          disabled={position >= questions.length - 1}
          testID="second-brain-question-next"
        >
          <ChevronRight size={18} color={theme.text2} />
        </IconButton>
      </View>
    ) : undefined;

  const offersHandOver = result ? canHandOver && canActOnAnswer(result.question.kind) : false;
  // A server older than the notes sends no such list.
  const notes = result?.notes ?? [];

  return (
    <Block title={t('SecondBrainQuestionsTitle')} action={pager} emphasis testID="second-brain-questions">
      {result ? (
        <View testID="second-brain-answer-result">
          <Text className="text-[12.5px] leading-[18px] text-text-2">{result.question.text}</Text>
          <View className="mt-3 flex-row items-start gap-2.5">
            <View className="mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-success/10">
              <Check size={13} color={theme.success} />
            </View>
            <View className="min-w-0 flex-1 gap-3">
              {result.learned.length > 0 ? (
                <View>
                  <Text className="text-sm font-semibold text-text">{t('SecondBrainLearnedTitle')}</Text>
                  <View className="mt-1.5 gap-1.5">
                    {result.learned.map((fact) => (
                      <Text key={fact.id} className="text-sm leading-5 text-text-2">
                        {fact.text}
                      </Text>
                    ))}
                  </View>
                </View>
              ) : null}
              {notes.length > 0 ? (
                <View testID="second-brain-answer-notes">
                  <Text className="text-sm font-semibold text-text">{t('SecondBrainLearnedNotesTitle')}</Text>
                  <View className="mt-1.5 gap-1.5">
                    {notes.map((note) => (
                      <Text key={note.id} className="text-sm leading-5 text-text-2">
                        <Text className="font-medium text-text">{note.subjectName}</Text>
                        {`: ${note.text}`}
                      </Text>
                    ))}
                  </View>
                </View>
              ) : null}
              {result.learned.length === 0 && notes.length === 0 ? (
                <Text className="text-sm leading-5 text-text">{t('SecondBrainLearnedNothing')}</Text>
              ) : null}
            </View>
          </View>
          <View className="mt-4 gap-2">
            {offersHandOver ? (
              <Button
                text={t('SecondBrainActOnIt')}
                mode="tonal"
                size="block"
                icon={<Sparkles size={15} color={theme.accent} />}
                onPress={handOver}
                testID="second-brain-act"
              />
            ) : null}
            <Button
              text={questions.length > 0 ? t('SecondBrainNextQuestion') : t('SecondBrainDone')}
              mode={offersHandOver ? 'ghost' : 'tonal'}
              size="block"
              onPress={() => setResult(null)}
              testID="second-brain-next"
            />
          </View>
        </View>
      ) : refilling && questions.length === 0 ? (
        <View testID="second-brain-questions-thinking">
          <Shimmer label={t('SecondBrainQuestionsThinking')} lines={['100%', '66%']} />
          <Text className="mt-4 text-[12.5px] text-text-3">{t('SecondBrainQuestionsThinking')}</Text>
        </View>
      ) : !current ? (
        <EmptyState
          icon={<MessageCircleQuestionMark size={20} color={theme.accent} />}
          title={t('SecondBrainQuestionsEmpty')}
          actionLabel={t('SecondBrainQuestionsMore')}
          onAction={onRefill}
          testID="second-brain-questions-empty"
        />
      ) : (
        // Keyed by question, so the box starts unfocused on the next one and the keyboard
        // does not stay up over a question the person has yet to read.
        <View key={current.id} testID="second-brain-question">
          <Chip variant="accent" size="sm" className="self-start">
            {t(SECOND_BRAIN_QUESTION_LABEL[current.kind])}
          </Chip>
          <Text className="mt-3 text-[17px] font-medium leading-6 text-text">{current.text}</Text>

          <View className="mt-4">
            <Input
              compact
              multiline
              label={t('SecondBrainAnswerLabel')}
              value={draft}
              onChangeText={(text) => setDrafts((prev) => ({ ...prev, [current.id]: text }))}
              maxLength={SECOND_BRAIN_ANSWER_MAX}
              accessibilityLabel={t('SecondBrainAnswerLabel')}
              accessibilityHint={t('SecondBrainAnswerHelp')}
              testID="second-brain-answer-input"
            />
            <View className="mt-1.5 flex-row items-baseline justify-between gap-3">
              <Text className="min-w-0 flex-1 text-[12px] text-text-3">{t('SecondBrainAnswerHelp')}</Text>
              {draft.length > SECOND_BRAIN_ANSWER_MAX * 0.8 ? (
                <Text className="font-mono text-[11px] text-text-3">
                  {draft.length}/{SECOND_BRAIN_ANSWER_MAX}
                </Text>
              ) : null}
            </View>
          </View>

          <View className="mt-4 flex-row flex-wrap gap-2">
            <Button
              text={t('SecondBrainAnswerSend')}
              mode="primary"
              size="auto"
              disabled={!trimmed || busy !== null}
              submitting={busy === 'answer'}
              onPress={() => void submit()}
              // Keeps its width while the spinner stands in for the label.
              className="min-w-[120px]"
              testID="second-brain-answer-send"
            />
            <Button
              text={t('SecondBrainQuestionSkip')}
              mode="ghost"
              size="auto"
              disabled={busy !== null}
              onPress={() => void skip()}
              testID="second-brain-question-skip"
            />
          </View>
        </View>
      )}
    </Block>
  );
}
