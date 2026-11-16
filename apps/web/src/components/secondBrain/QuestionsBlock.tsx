import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { SECOND_BRAIN_QUESTION_LABEL, canActOnAnswer } from "@beyou/state";
import type { RootState } from "@beyou/state/rootReducer";
import {
    SECOND_BRAIN_ANSWER_MAX,
    type SecondBrainAnswerResult,
    type SecondBrainQuestion,
} from "@beyou/types/secondBrain/secondBrain";
import Button from "../Button";
import Chip from "../../ui/Chip";
import IconButton from "../../ui/IconButton";
import { openAgentPanelWithDraft } from "../agent/agentPanelBus";
import Block, { Shimmer } from "./Block";

type QuestionsBlockProps = {
    /** Open questions, oldest first. */
    questions: SecondBrainQuestion[];
    /** True while the server is deciding what to ask next. */
    refilling: boolean;
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
 * After an answer the block shows what was kept, and for a question about the day or about
 * something in progress it offers to hand the answer to the assistant, which is the part of
 * Beyou that can check items, move habits and delete tasks. The hand-off only fills the
 * assistant's input. Nothing changes until the person sends it.
 */
export default function QuestionsBlock({ questions, refilling, onAnswer, onSkip, onRefill }: QuestionsBlockProps) {
    const { t } = useTranslation();
    const reducedMotion = useReducedMotion();
    const answerId = useId();
    // The assistant stays hidden until onboarding finishes, and a draft handed to a hidden
    // assistant would sit parked and turn up in its input days later. The phone hides the
    // hand-off the same way.
    const assistantReady = useSelector((state: RootState) => state.perfil.isTutorialCompleted);

    const [index, setIndex] = useState(0);
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState<"answer" | "skip" | null>(null);
    const [result, setResult] = useState<SecondBrainAnswerResult | null>(null);

    // The list shrinks under the cursor when a question is answered or skipped.
    useEffect(() => {
        if (index > 0 && index >= questions.length) setIndex(Math.max(0, questions.length - 1));
    }, [index, questions.length]);

    const current = questions[Math.min(index, questions.length - 1)];
    const draft = current ? (drafts[current.id] ?? "") : "";
    const trimmed = draft.trim();

    const submit = async () => {
        if (!current || !trimmed || busy) return;
        setBusy("answer");
        const outcome = await onAnswer(current.id, trimmed);
        setBusy(null);
        if (!outcome) return;
        setDrafts(({ [current.id]: _answered, ...rest }) => rest);
        setResult(outcome);
    };

    const skip = async () => {
        if (!current || busy) return;
        setBusy("skip");
        const ok = await onSkip(current.id);
        setBusy(null);
        if (ok) setDrafts(({ [current.id]: _skipped, ...rest }) => rest);
    };

    const handOver = () => {
        if (!result) return;
        openAgentPanelWithDraft(
            t("SecondBrainActOnItDraft", {
                question: result.question.text,
                answer: result.question.answer ?? "",
                interpolation: { escapeValue: false },
            }),
        );
    };

    const swap = reducedMotion
        ? {}
        : {
              initial: { opacity: 0, y: 8 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -8 },
              transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const },
          };

    const counter =
        !result && questions.length > 1 ? (
            <span className="font-mono text-xs text-text-2" data-testid="second-brain-question-count">
                {t("SecondBrainQuestionCount", { current: Math.min(index, questions.length - 1) + 1, total: questions.length })}
            </span>
        ) : undefined;

    return (
        <Block title={t("SecondBrainQuestionsTitle")} action={counter} emphasis testId="second-brain-questions">
            <AnimatePresence mode="wait" initial={false}>
                {result ? (
                    <motion.div key="result" {...swap} data-testid="second-brain-answer-result">
                        <p className="text-[13px] leading-snug text-text-2">{result.question.text}</p>
                        <div className="mt-3 flex items-start gap-2.5">
                            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                                <Check size={13} aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                                {result.learned.length > 0 ? (
                                    <>
                                        <p className="text-sm font-semibold text-text">{t("SecondBrainLearnedTitle")}</p>
                                        <ul className="mt-1.5 flex flex-col gap-1.5">
                                            {result.learned.map((fact) => (
                                                <li key={fact.id} className="text-sm leading-snug text-text-2">
                                                    {fact.text}
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                ) : (
                                    <p className="text-sm leading-snug text-text">{t("SecondBrainLearnedNothing")}</p>
                                )}
                            </div>
                        </div>
                        <div className="mt-5 flex flex-wrap gap-2">
                            {assistantReady && canActOnAnswer(result.question.kind) && (
                                <Button
                                    text={t("SecondBrainActOnIt")}
                                    mode="tonal"
                                    size="small"
                                    icon={<Sparkles size={14} />}
                                    onClick={handOver}
                                    testId="second-brain-act"
                                />
                            )}
                            <Button
                                text={questions.length > 0 ? t("SecondBrainNextQuestion") : t("SecondBrainDone")}
                                mode={assistantReady && canActOnAnswer(result.question.kind) ? "ghost" : "tonal"}
                                size="small"
                                onClick={() => setResult(null)}
                                testId="second-brain-next"
                            />
                        </div>
                    </motion.div>
                ) : refilling && questions.length === 0 ? (
                    <motion.div key="thinking" {...swap}>
                        <Shimmer label={t("SecondBrainQuestionsThinking")} lines={["w-full", "w-2/3"]} />
                        <p className="mt-4 text-[13px] text-text-3">{t("SecondBrainQuestionsThinking")}</p>
                    </motion.div>
                ) : !current ? (
                    <motion.div key="empty" {...swap} className="flex flex-col items-start gap-4">
                        <p className="text-sm leading-relaxed text-text-2">{t("SecondBrainQuestionsEmpty")}</p>
                        <Button
                            text={t("SecondBrainQuestionsMore")}
                            mode="tonal"
                            size="small"
                            onClick={onRefill}
                            disabled={refilling}
                            testId="second-brain-refill"
                        />
                    </motion.div>
                ) : (
                    <motion.form
                        key={current.id}
                        {...swap}
                        onSubmit={(event) => {
                            event.preventDefault();
                            void submit();
                        }}
                        data-testid="second-brain-question"
                    >
                        <Chip variant="accent" size="sm">
                            {t(SECOND_BRAIN_QUESTION_LABEL[current.kind])}
                        </Chip>
                        <p className="mt-3 text-[17px] font-medium leading-snug tracking-[-0.01em] text-text">
                            {current.text}
                        </p>

                        <div className="mt-4 flex flex-col gap-2">
                            <label htmlFor={answerId} className="text-[13px] font-semibold text-text-2">
                                {t("SecondBrainAnswerLabel")}
                            </label>
                            <textarea
                                id={answerId}
                                rows={3}
                                value={draft}
                                maxLength={SECOND_BRAIN_ANSWER_MAX}
                                aria-describedby={`${answerId}-help`}
                                onChange={(event) =>
                                    setDrafts((prev) => ({ ...prev, [current.id]: event.target.value }))
                                }
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                                        event.preventDefault();
                                        void submit();
                                    }
                                }}
                                className="w-full resize-y rounded-control border border-border bg-bg px-3 py-2.5 text-sm leading-relaxed text-text transition-colors duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                                data-testid="second-brain-answer-input"
                            />
                            <div className="flex items-baseline justify-between gap-3">
                                <p id={`${answerId}-help`} className="text-[12.5px] text-text-3">
                                    {t("SecondBrainAnswerHelp")}
                                </p>
                                {draft.length > SECOND_BRAIN_ANSWER_MAX * 0.8 && (
                                    <span className="font-mono text-[11px] text-text-3">
                                        {draft.length}/{SECOND_BRAIN_ANSWER_MAX}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    text={t("SecondBrainAnswerSend")}
                                    mode="primary"
                                    size="small"
                                    type="submit"
                                    disabled={!trimmed || busy !== null}
                                    testId="second-brain-answer-send"
                                />
                                <Button
                                    text={t("SecondBrainQuestionSkip")}
                                    mode="ghost"
                                    size="small"
                                    type="button"
                                    onClick={() => void skip()}
                                    disabled={busy !== null}
                                    testId="second-brain-question-skip"
                                />
                            </div>
                            {questions.length > 1 && (
                                <div className="flex items-center gap-1">
                                    <IconButton
                                        label={t("SecondBrainQuestionPrevious")}
                                        onClick={() => setIndex((value) => Math.max(0, value - 1))}
                                        disabled={index === 0}
                                    >
                                        <ChevronLeft size={16} aria-hidden="true" />
                                    </IconButton>
                                    <IconButton
                                        label={t("SecondBrainQuestionNext")}
                                        onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))}
                                        disabled={index >= questions.length - 1}
                                    >
                                        <ChevronRight size={16} aria-hidden="true" />
                                    </IconButton>
                                </div>
                            )}
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>
        </Block>
    );
}
