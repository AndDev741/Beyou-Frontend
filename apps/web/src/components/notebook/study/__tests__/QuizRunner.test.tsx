import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { StudyOutput } from "@beyou/types/notebook/notebook";
import { renderWithProviders } from "../../../../test/test-utils";

vi.mock("@beyou/api/notebook", () => ({ gradeQuiz: vi.fn() }));
vi.mock("../../../../hooks/useUiRefresh", () => ({ default: vi.fn() }));

import { gradeQuiz } from "@beyou/api/notebook";
import QuizRunner from "../QuizRunner";

const quiz: StudyOutput = {
    id: "quiz-1",
    pageId: "p1",
    kind: "QUIZ",
    title: "Trees",
    markdown: null,
    citations: [],
    questions: [
        { index: 0, question: "Left keys are?", options: ["Smaller", "Larger", "Equal", "Random"] },
        { index: 1, question: "Successor has?", options: ["Two children", "No left child", "A parent", "No keys"] },
    ],
    score: null,
    total: null,
    passedAt: null,
    createdAt: "2026-10-04T10:00:00Z",
};

beforeEach(() => {
    vi.clearAllMocks();
});

describe("QuizRunner", () => {
    test("sends the picks, then shows the score and marks right and wrong", async () => {
        vi.mocked(gradeQuiz).mockResolvedValue({
            success: {
                score: 1,
                total: 2,
                passed: false,
                xpEarned: 0,
                refreshUi: null,
                answers: [
                    { index: 0, chosen: 0, correct: 0, right: true, explanation: "Left is smaller.", citation: null },
                    { index: 1, chosen: 0, correct: 1, right: false, explanation: "It has no left child.", citation: null },
                ],
            },
        });
        const onGraded = vi.fn();
        renderWithProviders(<QuizRunner output={quiz} onClose={() => {}} onGraded={onGraded} />);

        const options = screen.getAllByTestId("quiz-option");
        fireEvent.click(options[0]); // question 1, "Smaller"
        fireEvent.click(options[4]); // question 2, "Two children"
        fireEvent.click(screen.getByTestId("quiz-submit"));

        const result = await screen.findByTestId("quiz-result");
        expect(gradeQuiz).toHaveBeenCalledWith("quiz-1", [0, 0], expect.any(Function));
        expect(result).toHaveTextContent("NotebookStudyQuizScore");
        expect(result).toHaveTextContent("NotebookStudyQuizNotYet");
        expect(screen.getByText("It has no left child.")).toBeInTheDocument();
        expect(screen.getByLabelText("NotebookStudyQuizWrong")).toBeInTheDocument();
        expect(onGraded).toHaveBeenCalledWith("quiz-1", expect.objectContaining({ score: 1 }));
    });

    /** Unanswered questions go as -1, which the server counts as wrong. */
    test("an unanswered question is sent as -1", async () => {
        vi.mocked(gradeQuiz).mockResolvedValue({
            success: { score: 1, total: 2, passed: false, xpEarned: 0, refreshUi: null, answers: [] },
        });
        renderWithProviders(<QuizRunner output={quiz} onClose={() => {}} onGraded={() => {}} />);

        fireEvent.click(screen.getAllByTestId("quiz-option")[0]);
        fireEvent.click(screen.getByTestId("quiz-submit"));

        await screen.findByTestId("quiz-result");
        expect(gradeQuiz).toHaveBeenCalledWith("quiz-1", [0, -1], expect.any(Function));
    });
});
