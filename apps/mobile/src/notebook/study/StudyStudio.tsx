import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useStore } from 'react-redux';
import { BookOpen, ChevronRight, FileText, Layers, ListChecks, Trash2 } from 'lucide-react-native';
import { deleteStudyOutput, generateCards, generateStudyOutput, gradeQuiz } from '@beyou/api/notebook';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { applyRefreshUi } from '@beyou/state/user/refreshUiThunk';
import type { QuizResult, StudyOutput, StudyOutputKind } from '@beyou/types/notebook/notebook';
import AgentMarkdown from '../../ui/agent/AgentMarkdown';
import BottomSheet from '../../ui/BottomSheet';
import Button from '../../ui/Button';
import DeleteModal from '../../ui/DeleteModal';
import { notify } from '../../notify';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import type { AppDispatch, RootState } from '../../store';
import { studyMarkdown } from './StudyChat';

/** The kind's name, for "Summary · Trees", as the web's outputLabels. */
export const OUTPUT_KIND_KEY: Record<StudyOutputKind, string> = {
  OVERVIEW: 'NotebookStudyOverviewTitle',
  SUMMARY: 'NotebookStudyKindSummary',
  STUDY_GUIDE: 'NotebookStudyKindGuide',
  QUIZ: 'NotebookStudyKindQuiz',
};

const MADE: { kind: StudyOutputKind; Icon: typeof FileText }[] = [
  { kind: 'SUMMARY', Icon: FileText },
  { kind: 'STUDY_GUIDE', Icon: BookOpen },
  { kind: 'QUIZ', Icon: ListChecks },
];

/**
 * The study room's studio on the phone: a summary, a study guide or a quiz made from what the
 * room reads, and six cards for the page. What is made stays under "Made here"; a summary or a
 * guide opens to read, a quiz to take, and passing it pays its XP the first time.
 */
export default function StudyStudio({
  pageId,
  initialOutputs,
  onCardsMade,
}: {
  pageId: string;
  initialOutputs: StudyOutput[];
  onCardsMade: () => void;
}) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [outputs, setOutputs] = useState<StudyOutput[]>(initialOutputs.filter((o) => o.kind !== 'OVERVIEW'));
  const [working, setWorking] = useState<StudyOutputKind | 'CARDS' | null>(null);
  const [open, setOpen] = useState<StudyOutput | null>(null);
  const [removing, setRemoving] = useState<StudyOutput | null>(null);

  useEffect(() => setOutputs(initialOutputs.filter((o) => o.kind !== 'OVERVIEW')), [initialOutputs]);

  const make = async (kind: StudyOutputKind) => {
    if (working) return;
    setWorking(kind);
    const response = await generateStudyOutput(pageId, kind, t);
    setWorking(null);
    if (!response.success) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    setOutputs((current) => [response.success!, ...current]);
    setOpen(response.success);
  };

  const makeCards = async () => {
    if (working) return;
    setWorking('CARDS');
    const response = await generateCards(pageId, { count: 6 }, t);
    setWorking(null);
    if (!response.success) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    notify.success(t('NotebookStudyCardsMade', { count: response.success.length }));
    onCardsMade();
  };

  const remove = async () => {
    if (!removing) return;
    const response = await deleteStudyOutput(removing.id, t);
    if (response.error) notify.error(getFriendlyErrorMessage(t, response.error));
    else setOutputs((current) => current.filter((o) => o.id !== removing.id));
    setRemoving(null);
  };

  const meta = (output: StudyOutput) => {
    if (output.kind !== 'QUIZ') return new Date(output.createdAt).toLocaleDateString();
    if (output.score !== null && output.total !== null) {
      return t(output.passedAt ? 'NotebookStudyQuizMetaPassed' : 'NotebookStudyQuizMetaTaken', {
        score: output.score,
        total: output.total,
      });
    }
    return t('NotebookStudyQuizMetaNew', { count: output.questions?.length ?? 0 });
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 10 }} testID="study-studio">
      <View className="flex-row flex-wrap gap-2">
        {MADE.map(({ kind, Icon }) => (
          <View key={kind} style={{ width: '48%' }}>
            <Button
              text={working === kind ? t('NotebookStudyWorking') : t(OUTPUT_KIND_KEY[kind])}
              mode="default"
              size="block"
              submitting={working === kind}
              disabled={working !== null && working !== kind}
              icon={<Icon size={15} color={theme.text} />}
              onPress={() => void make(kind)}
              testID={`study-make-${kind}`}
            />
          </View>
        ))}
        <View style={{ width: '48%' }}>
          <Button
            text={working === 'CARDS' ? t('NotebookStudyWorking') : t('NotebookStudyFlashcards')}
            mode="default"
            size="block"
            submitting={working === 'CARDS'}
            disabled={working !== null && working !== 'CARDS'}
            icon={<Layers size={15} color={theme.xp} />}
            onPress={() => void makeCards()}
            testID="study-make-cards-studio"
          />
        </View>
      </View>

      <Text className="pt-2 font-mono text-[11px] tracking-wide text-text-2">{t('NotebookStudyMadeHere').toUpperCase()}</Text>
      {outputs.length === 0 ? (
        <Text className="text-[13px] leading-[18px] text-text-2" testID="study-made-empty">{t('NotebookStudyMadeHereEmpty')}</Text>
      ) : (
        <View className="overflow-hidden rounded-[14px] border border-border bg-surface">
          {outputs.map((output, index) => (
            <View key={output.id} className={`flex-row items-center ${index > 0 ? 'border-t border-border' : ''}`}>
              <Pressable
                onPress={() => setOpen(output)}
                accessibilityRole="button"
                className="min-h-[56px] flex-1 justify-center px-3 py-2.5"
                testID="study-output"
              >
                <Text className="text-[14px] font-semibold text-text" numberOfLines={1}>
                  {`${t(OUTPUT_KIND_KEY[output.kind])} · ${output.title}`}
                </Text>
                <Text className="text-[12px] text-text-2">{meta(output)}</Text>
              </Pressable>
              <Pressable
                onPress={() => setRemoving(output)}
                accessibilityRole="button"
                accessibilityLabel={t('Delete')}
                className="h-11 w-10 items-center justify-center"
                testID="study-output-delete"
              >
                <Trash2 size={16} color={theme.text3} />
              </Pressable>
              <ChevronRight size={16} color={theme.text3} style={{ marginRight: 10 }} />
            </View>
          ))}
        </View>
      )}

      <OutputSheet
        output={open}
        onClose={() => setOpen(null)}
        onGraded={(result) => {
          if (!open) return;
          setOutputs((current) =>
            current.map((o) =>
              o.id === open.id
                ? { ...o, score: result.score, total: result.total, passedAt: result.passed && !o.passedAt ? new Date().toISOString() : o.passedAt }
                : o,
            ),
          );
        }}
      />
      <DeleteModal
        visible={removing !== null}
        deletePhrase={t('Delete')}
        name={removing ? `${t(OUTPUT_KIND_KEY[removing.kind])} · ${removing.title}` : ''}
        onCancel={() => setRemoving(null)}
        onConfirm={() => void remove()}
        testID="study-output-delete-modal"
      />
    </ScrollView>
  );
}

/** A made output, opened: a summary or a guide to read, or a quiz to take. */
function OutputSheet({
  output,
  onClose,
  onGraded,
}: {
  output: StudyOutput | null;
  onClose: () => void;
  onGraded: (result: QuizResult) => void;
}) {
  const { t } = useTranslation();
  return (
    <BottomSheet visible={output !== null} onClose={onClose}>
      {output ? (
        <View className="gap-3" style={{ flexShrink: 1 }} testID="study-output-sheet">
          <Text accessibilityRole="header" className="text-[17px] font-bold text-text">
            {`${t(OUTPUT_KIND_KEY[output.kind])} · ${output.title}`}
          </Text>
          {output.kind === 'QUIZ' ? (
            <QuizRunner output={output} onGraded={onGraded} />
          ) : (
            <ScrollView style={{ flexShrink: 1 }}>
              <AgentMarkdown text={studyMarkdown(output.markdown ?? '')} />
            </ScrollView>
          )}
        </View>
      ) : null}
    </BottomSheet>
  );
}

/**
 * A quiz, one choice per question, graded on the server. The answers come back with the right
 * one and why; passing (70%) pays its XP the first time.
 */
export function QuizRunner({ output, onGraded }: { output: StudyOutput; onGraded: (result: QuizResult) => void }) {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const questions = output.questions ?? [];
  const [chosen, setChosen] = useState<Record<number, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const response = await gradeQuiz(output.id, questions.map((q) => chosen[q.index] ?? -1), t);
    setBusy(false);
    if (!response.success) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    setResult(response.success);
    onGraded(response.success);
    if (response.success.refreshUi) {
      const prev = store.getState().perfil;
      applyRefreshUi(response.success.refreshUi, dispatch, { level: prev.level, constance: prev.constance });
    }
  };

  const retake = () => {
    setChosen({});
    setResult(null);
  };

  const answerOf = (index: number) => result?.answers.find((a) => a.index === index);

  return (
    <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 14 }} testID="study-quiz">
      {questions.map((question) => {
        const graded = answerOf(question.index);
        return (
          <View key={question.index} className="gap-1.5">
            <Text className="text-[14px] font-semibold leading-5 text-text">{`${question.index + 1}. ${question.question}`}</Text>
            {question.options.map((option, i) => {
              const picked = chosen[question.index] === i;
              const right = graded && graded.correct === i;
              const wrong = graded && graded.chosen === i && !graded.right;
              return (
                <Pressable
                  key={i}
                  disabled={!!result}
                  onPress={() => setChosen((current) => ({ ...current, [question.index]: i }))}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: picked }}
                  className={`rounded-xl border px-3 py-2.5 ${
                    right ? 'border-success bg-success/10' : wrong ? 'border-danger bg-danger/10' : picked ? 'border-accent bg-accent-soft' : 'border-border bg-surface'
                  }`}
                  testID={`study-quiz-option-${question.index}-${i}`}
                >
                  <Text className="text-[14px] text-text">{option}</Text>
                  {right ? <Text className="text-[11.5px] font-semibold text-success">{t('NotebookStudyQuizRight')}</Text> : null}
                  {wrong ? <Text className="text-[11.5px] font-semibold text-danger">{t('NotebookStudyQuizWrong')}</Text> : null}
                </Pressable>
              );
            })}
            {graded?.explanation ? <Text className="text-[12.5px] leading-[18px] text-text-2">{graded.explanation}</Text> : null}
          </View>
        );
      })}
      {result ? (
        <View className={`gap-1 rounded-card p-3 ${result.passed ? 'bg-success/10' : 'bg-surface-2'}`} testID="study-quiz-result">
          <Text className="text-[15px] font-bold text-text">{t('NotebookStudyQuizScore', { score: result.score, total: result.total })}</Text>
          <Text className="text-[13px] text-text-2">{result.passed ? t('NotebookStudyQuizPassed') : t('NotebookStudyQuizNotYet')}</Text>
          {result.xpEarned > 0 ? <Text className="text-[13px] font-semibold text-xp">{t('NotebookStudyQuizXp', { xp: Math.round(result.xpEarned) })}</Text> : null}
          <Button text={t('NotebookStudyQuizRetake')} mode="default" size="auto" onPress={retake} testID="study-quiz-retake" />
        </View>
      ) : (
        <Button
          text={t('NotebookStudyQuizSubmit')}
          mode="primary"
          size="block"
          submitting={busy}
          disabled={questions.some((q) => chosen[q.index] === undefined)}
          onPress={() => void submit()}
          testID="study-quiz-submit"
        />
      )}
    </ScrollView>
  );
}
