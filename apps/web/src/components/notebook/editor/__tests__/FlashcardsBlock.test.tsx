import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi, type Mock } from "vitest";
import { renderWithProviders } from "../../../../test/test-utils";

vi.mock("@beyou/api/notebook", () => ({
    getPageCards: vi.fn(),
    createCard: vi.fn(),
    updateCard: vi.fn(),
    deleteCard: vi.fn(),
    generateCards: vi.fn(),
}));
vi.mock("../../../../hooks/useTodayInZone", () => ({ default: () => "2026-10-07" }));

import { getPageCards } from "@beyou/api/notebook";
import FlashcardsBlock from "../FlashcardsBlock";

const card = (n: number) => ({
    id: `c${n}`, pageId: "p1", front: `Question ${n}?`, back: `Answer ${n}.`,
    sourceLabel: null, dueOn: "2026-10-07", intervalDays: 0, reps: 0, createdAt: "2026-10-07T00:00:00Z",
});

describe("FlashcardsBlock", () => {
    beforeEach(() => {
        (getPageCards as Mock).mockResolvedValue({ success: [1, 2, 3, 4, 5].map(card) });
    });

    test("shows questions, keeps answers closed until one is opened, and lists three until asked for all", async () => {
        renderWithProviders(<FlashcardsBlock pageId="p1" cardsTotal={5} />);

        await waitFor(() => expect(screen.getAllByTestId("card-row")).toHaveLength(3));
        expect(screen.queryByText("Answer 1.")).toBeNull();

        fireEvent.click(screen.getByText("Question 1?"));
        expect(screen.getByText("Answer 1.")).toBeTruthy();

        fireEvent.click(screen.getByTestId("cards-show-all"));
        expect(screen.getAllByTestId("card-row")).toHaveLength(5);
    });

    test("reads the deck again when the page's card count moves, as after the assistant drafts some", async () => {
        const { rerender } = renderWithProviders(<FlashcardsBlock pageId="p1" cardsTotal={5} />);
        await waitFor(() => expect(getPageCards).toHaveBeenCalledTimes(1));

        rerender(<FlashcardsBlock pageId="p1" cardsTotal={9} />);

        await waitFor(() => expect(getPageCards).toHaveBeenCalledTimes(2));
    });
});
