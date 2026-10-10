import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { AlignLeft, Check, GraduationCap, Headphones, HelpCircle, Layers, PanelRightClose, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { StudyOutput, StudyOutputKind, SuggestedNode } from "@beyou/types/notebook/notebook";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import { addBoardNode, generateCards, generateStudyOutput, getBoard, suggestNodes } from "@beyou/api/notebook";
import ErrorNotice from "../../ErrorNotice";
import OutputViewer from "./OutputViewer";
import QuizRunner from "./QuizRunner";
import { OUTPUT_KIND_KEY } from "./outputLabels";
import { AiWaitingLine } from "../aiWaiting";

type Props = {
    pageId: string;
    pageTitle: string;
    initialOutputs: StudyOutput[];
    cardsTotal: number;
    cardsDue: number;
    /** Cards the studio made, so the room's counts stay true. */
    onCardsMade?: (count: number) => void;
    /** Folds the panel into a rail (desktop). */
    onCollapse?: () => void;
};

type Busy = "SUMMARY" | "STUDY_GUIDE" | "QUIZ" | "CARDS" | "BOARD" | null;

/** Where a kept suggestion goes: right of the board's last node, on the first row. */
const NODE_STEP = 240;
const NODE_Y = 80;

/**
 * Things the AI makes from this page and its sources: a summary, a study guide, flashcards, a
 * quiz, or nodes for the page's board. Everything made shows under "Made here", and summaries
 * and guides can be saved into the page as ordinary blocks.
 */
export default function StudioPanel({ pageId, pageTitle, initialOutputs, cardsTotal, cardsDue, onCardsMade, onCollapse }: Props) {
    const { t, i18n } = useTranslation();
    const [outputs, setOutputs] = useState<StudyOutput[]>(initialOutputs);
    const [busy, setBusy] = useState<Busy>(null);
    const [error, setError] = useState<ApiErrorPayload | null>(null);
    const [viewing, setViewing] = useState<StudyOutput | null>(null);
    const [quiz, setQuiz] = useState<StudyOutput | null>(null);
    const [suggestions, setSuggestions] = useState<SuggestedNode[] | null>(null);
    const [cardsMade, setCardsMade] = useState<number | null>(null);

    useEffect(() => setOutputs(initialOutputs), [initialOutputs]);

    const generate = async (kind: Exclude<StudyOutputKind, "OVERVIEW">) => {
        setBusy(kind);
        setError(null);
        const response = await generateStudyOutput(pageId, kind, t);
        setBusy(null);
        if (!response.success) {
            setError(response.error ?? null);
            return;
        }
        setOutputs((current) => [response.success!, ...current]);
        if (kind === "QUIZ") setQuiz(response.success);
        else setViewing(response.success);
    };

    const makeCards = async () => {
        setBusy("CARDS");
        setError(null);
        setCardsMade(null);
        const response = await generateCards(pageId, { count: 6 }, t);
        setBusy(null);
        if (!response.success) {
            setError(response.error ?? null);
            return;
        }
        setCardsMade(response.success.length);
        onCardsMade?.(response.success.length);
    };

    const suggestBoard = async () => {
        setBusy("BOARD");
        setError(null);
        const response = await suggestNodes(pageId, true, t);
        setBusy(null);
        if (!response.success) {
            setError(response.error ?? null);
            return;
        }
        setSuggestions(response.success);
    };

    const keep = async (suggestion: SuggestedNode) => {
        const board = await getBoard(pageId, t);
        const maxX = board.success?.nodes.length
            ? Math.max(...board.success.nodes.map((n) => n.x))
            : null;
        const x = maxX === null ? 40 : maxX + NODE_STEP;
        const response = await addBoardNode(pageId, { kind: "PAGE", title: suggestion.title, x, y: NODE_Y }, t);
        if (response.error) {
            toast.error(getFriendlyErrorMessage(t, response.error));
            return;
        }
        toast.success(t("NotebookStudyNodeKept", { title: suggestion.title }));
        setSuggestions((current) => current?.filter((s) => s.title !== suggestion.title) ?? null);
    };

    const dismiss = (suggestion: SuggestedNode) =>
        setSuggestions((current) => current?.filter((s) => s.title !== suggestion.title) ?? null);

    const tiles: { id: Busy; label: string; Icon: LucideIcon; onClick: () => void; testId?: string }[] = [
        { id: "SUMMARY", label: t("NotebookStudyKindSummary"), Icon: AlignLeft, onClick: () => generate("SUMMARY") },
        { id: "STUDY_GUIDE", label: t("NotebookStudyKindGuide"), Icon: GraduationCap, onClick: () => generate("STUDY_GUIDE") },
        { id: "CARDS", label: t("NotebookStudyFlashcards"), Icon: Layers, onClick: makeCards },
        { id: "QUIZ", label: t("NotebookStudyKindQuiz"), Icon: HelpCircle, onClick: () => generate("QUIZ"), testId: "study-studio-quiz" },
        { id: "BOARD", label: t("NotebookStudyBoardFromSources"), Icon: Workflow, onClick: suggestBoard },
    ];

    return (
        <section
            aria-labelledby="study-studio-title"
            className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface p-4"
        >
            <div className="flex items-center gap-2">
                <h2 id="study-studio-title" className="flex-1 text-[15px] font-semibold text-text">
                    {t("NotebookStudyStudio")}
                </h2>
                {onCollapse && (
                    <button type="button" onClick={onCollapse} aria-label={t("NotebookStudyCollapseStudio")} title={t("NotebookStudyCollapseStudio")}
                        data-testid="study-collapse-right"
                        className="hidden h-8 w-8 items-center justify-center rounded-[8px] text-text-2 hover:bg-surface-2 lg:inline-flex">
                        <PanelRightClose size={16} aria-hidden="true" />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2">
                {tiles.map(({ id, label, Icon, onClick, testId }) => (
                    <button
                        key={id}
                        type="button"
                        onClick={onClick}
                        disabled={busy !== null}
                        data-testid={testId}
                        aria-busy={busy === id}
                        className={`flex flex-col items-start gap-1.5 rounded-control border p-3 text-left text-text transition-colors disabled:cursor-wait ${
                            busy === id ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-accent"
                        }`}
                    >
                        <Icon size={18} className="text-accent" aria-hidden="true" />
                        <span className="text-[13px] font-semibold">{label}</span>
                        {busy === id && <AiWaitingLine label={t("NotebookStudyWorking")} slowNote={false} className="text-[11px] text-text-2" />}
                    </button>
                ))}
                <button
                    type="button"
                    disabled
                    className="flex flex-col items-start gap-1.5 rounded-control border border-dashed border-border p-3 text-left text-text-2"
                >
                    <Headphones size={18} aria-hidden="true" />
                    <span className="text-[13px] font-semibold">{t("NotebookStudyAudio")}</span>
                    <span className="text-[11px]">{t("NotebookStudyLaterPhase")}</span>
                </button>
            </div>

            <ErrorNotice error={error} canReport={false} />

            {cardsMade !== null && (
                <p className="flex items-center gap-2 rounded-control bg-success/10 p-2.5 text-sm text-text" role="status">
                    <Check size={15} className="text-success" aria-hidden="true" />
                    {t("NotebookStudyCardsMade", { count: cardsMade })}
                </p>
            )}

            {suggestions && (
                <div className="flex flex-col gap-2" data-testid="study-suggestions">
                    <div className="text-xs font-semibold uppercase tracking-[0.06em] text-text-2">
                        {t("NotebookStudySuggestionsTitle")}
                    </div>
                    {suggestions.length === 0 && <p className="text-sm text-text-2">{t("NotebookStudySuggestionsNone")}</p>}
                    {suggestions.map((s) => (
                        <div key={s.title} className="rounded-control border border-dashed border-accent bg-accent-soft p-3">
                            <p className="text-[13px] font-semibold text-text">{s.title}</p>
                            {s.why && <p className="mt-0.5 text-xs text-text-2">{s.why}</p>}
                            <div className="mt-2 flex gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => keep(s)}
                                    className="h-7 rounded-[8px] bg-accent px-2.5 text-xs font-semibold text-on-accent hover:bg-accent-strong"
                                >
                                    {t("NotebookStudyKeep")}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => dismiss(s)}
                                    className="h-7 rounded-[8px] border border-border bg-surface px-2.5 text-xs font-semibold text-text hover:bg-surface-2"
                                >
                                    {t("NotebookStudyDismiss")}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.06em] text-text-2">{t("NotebookStudyMadeHere")}</div>
            <ul className="flex flex-col gap-2">
                <li className="flex items-center gap-2.5 rounded-control border border-border px-3 py-2.5" data-testid="study-flashcards-row">
                    <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[13px] font-semibold text-text">
                            {t("NotebookStudyFlashcards")} · {pageTitle}
                        </span>
                        <span className="text-xs text-text-2">
                            {t("NotebookStudyCardsCount", { count: cardsTotal, due: cardsDue })}
                        </span>
                    </span>
                    {cardsDue > 0 && (
                        <Link
                            to={`/notebook/review?page=${pageId}`}
                            className="inline-flex h-[30px] items-center rounded-[8px] bg-text px-2.5 text-xs font-semibold text-surface"
                        >
                            {t("NotebookStudyReview")}
                        </Link>
                    )}
                </li>
                {outputs.map((output) => (
                    <li key={output.id}>
                        <button
                            type="button"
                            onClick={() => (output.kind === "QUIZ" ? setQuiz(output) : setViewing(output))}
                            data-testid="study-output-row"
                            className="flex w-full items-center gap-2.5 rounded-control border border-border px-3 py-2.5 text-left hover:bg-surface-2"
                        >
                            <span className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate text-[13px] font-semibold text-text">
                                    {t(OUTPUT_KIND_KEY[output.kind])} · {output.title}
                                </span>
                                <span className="text-xs text-text-2">{outputMeta(output, t, i18n.language)}</span>
                            </span>
                            {output.kind === "QUIZ" && output.passedAt && (
                                <span className="rounded-full bg-xp-soft px-2 py-0.5 font-mono text-[11px] font-semibold text-xp">+XP</span>
                            )}
                        </button>
                    </li>
                ))}
            </ul>
            {outputs.length === 0 && <p className="text-xs leading-5 text-text-2">{t("NotebookStudyMadeHereEmpty")}</p>}

            <OutputViewer
                pageId={pageId}
                output={viewing}
                onClose={() => setViewing(null)}
                onDeleted={(id) => setOutputs((current) => current.filter((o) => o.id !== id))}
            />
            {quiz && (
                <QuizRunner
                    key={quiz.id}
                    output={quiz}
                    onClose={() => setQuiz(null)}
                    onGraded={(id, result) =>
                        setOutputs((current) =>
                            current.map((o) =>
                                o.id === id
                                    ? {
                                          ...o,
                                          score: result.score,
                                          total: result.total,
                                          passedAt: result.passed && !o.passedAt ? new Date().toISOString() : o.passedAt,
                                      }
                                    : o
                            )
                        )
                    }
                />
            )}
        </section>
    );
}

function outputMeta(
    output: StudyOutput,
    t: (key: string, options?: Record<string, unknown>) => string,
    language: string,
): string {
    if (output.kind === "QUIZ") {
        if (output.score !== null && output.total !== null) {
            return t(output.passedAt ? "NotebookStudyQuizMetaPassed" : "NotebookStudyQuizMetaTaken", {
                score: output.score,
                total: output.total,
            });
        }
        return t("NotebookStudyQuizMetaNew", { count: output.questions?.length ?? 0 });
    }
    return new Date(output.createdAt).toLocaleDateString(language);
}
