import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { DueCard } from "@beyou/types/notebook/notebook";
import { renderWithProviders } from "../../../test/test-utils";

vi.mock("@beyou/api/notebook", () => ({
    getDueCards: vi.fn(),
    reviewCard: vi.fn(),
    finishReview: vi.fn(),
}));
vi.mock("../../../hooks/useUiRefresh", () => ({ default: vi.fn() }));

import { finishReview, getDueCards, reviewCard } from "@beyou/api/notebook";
import NotebookReview from "../NotebookReview";

const card = (id: string, front: string): DueCard => ({
    id, pageId: "p1", pageTitle: "Trees", topicId: "t1", topicTitle: "Data Structures",
    front, back: `answer to ${front}`, sourceLabel: null,
    intervals: { AGAIN: 0, HARD: 2, GOOD: 4, EASY: 9 },
});

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(finishReview).mockResolvedValue({ success: { paidReviews: 3, xpEarned: 3, streak: 2, refreshUi: null } });
});

describe("NotebookReview", () => {
    /**
     * AGAIN sends the card to the back of the session, so the session only ends once every card
     * has been remembered. Finishing pays once, at the end.
     */
    test("a forgotten card comes back, and the session finishes when every card is remembered", async () => {
        vi.mocked(getDueCards).mockResolvedValue({ success: { cards: [card("a", "First"), card("b", "Second")], total: 2, streak: 1 } });
        vi.mocked(reviewCard)
            .mockResolvedValueOnce({ success: { cardId: "a", dueOn: "2026-10-04", intervalDays: 0, dueAgainToday: true } })
            .mockResolvedValueOnce({ success: { cardId: "b", dueOn: "2026-10-08", intervalDays: 4, dueAgainToday: false } })
            .mockResolvedValueOnce({ success: { cardId: "a", dueOn: "2026-10-05", intervalDays: 1, dueAgainToday: false } });

        renderWithProviders(<NotebookReview />, { route: "/notebook/review" });

        expect(await screen.findByText("First")).toBeInTheDocument();
        fireEvent.click(screen.getByTestId("review-show"));
        expect(screen.getByTestId("review-answer")).toHaveTextContent("answer to First");
        fireEvent.click(screen.getByTestId("review-rate-AGAIN"));

        expect(await screen.findByText("Second")).toBeInTheDocument();
        fireEvent.click(screen.getByTestId("review-show"));
        fireEvent.click(screen.getByTestId("review-rate-GOOD"));

        expect(await screen.findByText("First")).toBeInTheDocument();
        expect(finishReview).not.toHaveBeenCalled();
        fireEvent.click(screen.getByTestId("review-show"));
        fireEvent.click(screen.getByTestId("review-rate-GOOD"));

        expect(await screen.findByTestId("review-summary")).toHaveTextContent("+3 XP");
        expect(finishReview).toHaveBeenCalledTimes(1);
        expect(reviewCard).toHaveBeenNthCalledWith(1, "a", "AGAIN", expect.any(Function));
    });

    test("the queue is scoped to the page in the address", async () => {
        vi.mocked(getDueCards).mockResolvedValue({ success: { cards: [], total: 0, streak: 0 } });

        renderWithProviders(<NotebookReview />, { route: "/notebook/review?page=p9" });

        expect(await screen.findByTestId("review-empty")).toBeInTheDocument();
        await waitFor(() => expect(getDueCards).toHaveBeenCalledWith("p9", expect.any(Function)));
    });
});
