import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ChatTurn } from "@beyou/types/notebook/notebook";
import { renderWithProviders } from "../../../../test/test-utils";

vi.mock("@beyou/api/notebook", () => ({
    askStudyQuestion: vi.fn(),
    appendToPage: vi.fn(),
    clearStudyChat: vi.fn(),
    generateCards: vi.fn(),
    generateStudyOutput: vi.fn(),
    getStudyRoom: vi.fn(),
    getPassage: vi.fn(),
}));

import { appendToPage, askStudyQuestion } from "@beyou/api/notebook";
import ChatPanel from "../ChatPanel";

const turn: ChatTurn = {
    question: {
        id: "q1",
        role: "USER",
        content: "Why the successor?",
        citations: [],
        createdAt: "2026-10-04T10:00:00Z",
    },
    answer: {
        id: "a1",
        role: "ASSISTANT",
        content: "The successor keeps the order [1].",
        citations: [
            {
                n: 1,
                kind: "SOURCE",
                sourceId: "s1",
                chunkId: "c1",
                pageId: null,
                title: "CLRS (pdf, page 296)",
                pageNumber: 296,
                excerpt: "The successor has no left child.",
            },
        ],
        createdAt: "2026-10-04T10:00:01Z",
    },
};

beforeEach(() => {
    vi.clearAllMocks();
});

describe("ChatPanel", () => {
    test("asks a question, shows the cited answer, and opens the citation", async () => {
        vi.mocked(askStudyQuestion).mockResolvedValue({ success: turn });
        renderWithProviders(<ChatPanel pageId="p1" initialMessages={[]} initialOverview={null} />);

        fireEvent.change(screen.getByTestId("study-chat-input"), { target: { value: "Why the successor?" } });
        fireEvent.click(screen.getByTestId("study-chat-send"));

        const answer = await screen.findByTestId("study-answer");
        expect(askStudyQuestion).toHaveBeenCalledWith("p1", "Why the successor?", expect.any(Function));
        expect(answer).toHaveTextContent("The successor keeps the order");

        fireEvent.click(screen.getByTestId("citation-1"));
        const panel = await screen.findByTestId("citation-panel");
        expect(panel).toHaveTextContent("The successor has no left child.");
        expect(panel).toHaveTextContent("CLRS (pdf, page 296)");
    });

    /** A failed question keeps what was typed, so the person does not have to write it again. */
    test("a failed question is kept in the box", async () => {
        vi.mocked(askStudyQuestion).mockResolvedValue({ error: { errorKey: "NOTEBOOK_NOTHING_TO_STUDY" } });
        renderWithProviders(<ChatPanel pageId="p1" initialMessages={[]} initialOverview={null} />);

        fireEvent.change(screen.getByTestId("study-chat-input"), { target: { value: "Anything?" } });
        fireEvent.click(screen.getByTestId("study-chat-send"));

        await screen.findByText("NOTEBOOK_NOTHING_TO_STUDY");
        expect(screen.getByTestId("study-chat-input")).toHaveValue("Anything?");
        expect(screen.queryByTestId("study-answer")).toBeNull();
    });

    test("saves an answer to the page as markdown", async () => {
        vi.mocked(appendToPage).mockResolvedValue({ success: {} as never });
        renderWithProviders(
            <ChatPanel pageId="p1" initialMessages={[turn.question, turn.answer]} initialOverview={null} />
        );

        fireEvent.click(screen.getByTestId("study-save-to-page"));

        await waitFor(() =>
            expect(appendToPage).toHaveBeenCalledWith("p1", "The successor keeps the order [1].", expect.any(Function))
        );
        // The buttons come back once the save settles; waiting for that keeps the update inside act.
        await waitFor(() => expect(screen.getByTestId("study-save-to-page")).not.toBeDisabled());
    });
});
