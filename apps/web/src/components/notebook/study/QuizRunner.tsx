import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Check, X } from "lucide-react";
import type { QuizResult, StudyOutput } from "@beyou/types/notebook/notebook";
import type { RefreshUI } from "@beyou/types/refreshUi/refreshUi.type";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import { gradeQuiz } from "@beyou/api/notebook";
import Modal from "../../modals/Modal";
import ErrorNotice from "../../ErrorNotice";
import useUiRefresh from "../../../hooks/useUiRefresh";

type Props = {
    output: StudyOutput | null;
    onClose: () => void;
    /** The quiz's new score, so the "Made here" row can show it without a refetch. */
    onGraded: (outputId: string, result: QuizResult) => void;
};

/**
 * Takes a quiz. Every question is on one screen, so the person can go back and change an answer
 * before submitting. The answers are only known to the server, which grades the picks and pays
 * the XP the first time the quiz is passed.
 */
export default function QuizRunner({ output, onClose, onGraded }: Props) {
    const { t } = useTranslation();
    const questions = output?.questions ?? [];
    const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
    const [result, setResult] = useState<QuizResult | null>(null);
    const [error, setError] = useState<ApiErrorPayload | null>(null);
    const [busy, setBusy] = useState(false);
    const [refreshUi, setRefreshUi] = useState<RefreshUI>({});
    useUiRefresh(refreshUi);

    if (!output) return null;

    const pick = (question: number, option: number) => {
        if (result) return;
        setAnswers((current) => current.map((value, index) => (index === question ? option : value)));
    };

    const submit = async () => {
        setBusy(true);
        setError(null);
        const response = await gradeQuiz(output.id, answers, t);
        setBusy(false);
        if (!response.success) {
            setError(response.error ?? null);
            return;
        }
        setResult(response.success);
        onGraded(output.id, response.success);
        if (response.success.xpEarned > 0) {
            toast.success(t("NotebookStudyQuizXp", { xp: response.success.xpEarned }));
        }
        if (response.success.refreshUi) setRefreshUi(response.success.refreshUi);
    };

    const retake = () => {
        setResult(null);
        setAnswers(questions.map(() => -1));
    };

    const answered = answers.filter((a) => a >= 0).length;
    const graded = (index: number) => result?.answers.find((a) => a.index === index);

    return (
        <Modal isOpen onClose={onClose} labelledBy="study-quiz-title" className="max-w-2xl">
            <div className="flex items-start gap-3">
                <h2 id="study-quiz-title" className="flex-1 text-lg font-semibold text-text">
                    {t("NotebookStudyKindQuiz")} · {output.title}
                </h2>
                <button type="button" onClick={onClose} aria-label={t("Close")} className="rounded-control p-1.5 text-text-2 hover:bg-surface-2">
                    <X size={18} aria-hidden="true" />
                </button>
            </div>

            {result && (
                <div
                    data-testid="quiz-result"
                    className={`mt-4 rounded-card p-4 ${result.passed ? "bg-success/10" : "bg-surface-2"}`}
                >
                    <p className="text-base font-semibold text-text">
                        {t("NotebookStudyQuizScore", { score: result.score, total: result.total })}
                    </p>
                    <p className="mt-1 text-sm text-text-2">
                        {result.passed ? t("NotebookStudyQuizPassed") : t("NotebookStudyQuizNotYet")}
                    </p>
                </div>
            )}

            <ol className="mt-4 flex flex-col gap-5">
                {questions.map((question) => {
                    const g = graded(question.index);
                    return (
                        <li key={question.index} className="flex flex-col gap-2">
                            <fieldset className="flex flex-col gap-2">
                                <legend className="mb-1 text-[15px] font-semibold leading-6 text-text">
                                    {question.index + 1}. {question.question}
                                </legend>
                                {question.options.map((option, optionIndex) => {
                                    const chosen = answers[question.index] === optionIndex;
                                    const correct = g && g.correct === optionIndex;
                                    const wrongPick = g && chosen && !g.right;
                                    return (
                                        <label
                                            key={optionIndex}
                                            data-testid="quiz-option"
                                            className={`flex cursor-pointer items-center gap-3 rounded-control border px-3 py-2.5 text-sm transition-colors ${
                                                correct
                                                    ? "border-success bg-success/10"
                                                    : wrongPick
                                                      ? "border-danger bg-danger/10"
                                                      : chosen
                                                        ? "border-accent bg-accent-soft"
                                                        : "border-border hover:bg-surface-2"
                                            } ${result ? "cursor-default" : ""}`}
                                        >
                                            <input
                                                type="radio"
                                                name={`quiz-${output.id}-${question.index}`}
                                                checked={chosen}
                                                disabled={result !== null}
                                                onChange={() => pick(question.index, optionIndex)}
                                                className="h-4 w-4 accent-[var(--accent)]"
                                            />
                                            <span className="flex-1 text-text">{option}</span>
                                            {correct && <Check size={16} className="text-success" aria-label={t("NotebookStudyQuizRight")} />}
                                            {wrongPick && <X size={16} className="text-danger" aria-label={t("NotebookStudyQuizWrong")} />}
                                        </label>
                                    );
                                })}
                            </fieldset>
                            {g && g.explanation && (
                                <p className="rounded-control bg-surface-2 p-3 text-sm leading-6 text-text-2">{g.explanation}</p>
                            )}
                        </li>
                    );
                })}
            </ol>

            <ErrorNotice error={error} className="mt-3" />

            <div className="mt-5 flex items-center justify-between gap-3">
                <span className="text-sm text-text-2">
                    {t("NotebookStudyQuizAnswered", { answered, total: questions.length })}
                </span>
                {result ? (
                    <button
                        type="button"
                        onClick={retake}
                        className="h-10 rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text hover:bg-surface-2"
                    >
                        {t("NotebookStudyQuizRetake")}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={submit}
                        disabled={busy || answered === 0}
                        data-testid="quiz-submit"
                        className="h-10 rounded-control bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-strong disabled:opacity-60"
                    >
                        {busy ? t("NotebookStudyWorking") : t("NotebookStudyQuizSubmit")}
                    </button>
                )}
            </div>
        </Modal>
    );
}
