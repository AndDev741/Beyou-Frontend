import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ChatTurn } from "@beyou/types/notebook/notebook";
import { renderWithProviders } from "../../../../test/test-utils";

vi.mock("@beyou/api/notebook", () => ({
    askStudyQuestion: vi.fn(),
    appendToPage: vi.fn(),
    appendDiagramToPage: vi.fn(),
    generateDiagram: vi.fn(),
    clearStudyChat: vi.fn(),
    generateCards: vi.fn(),
    generateStudyOutput: vi.fn(),
    getStudyRoom: vi.fn(),
    getPassage: vi.fn(),
}));

import { appendDiagramToPage, appendToPage, askStudyQuestion } from "@beyou/api/notebook";
import type { DiagramSpec } from "@beyou/types/notebook/diagram";
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

    /** Reported in prod: Shift+Enter sent a half-written question instead of starting a line. */
    test("Enter sends, Shift+Enter starts a new line", async () => {
        vi.mocked(askStudyQuestion).mockResolvedValue({ success: turn });
        renderWithProviders(<ChatPanel pageId="p1" initialMessages={[]} initialOverview={null} />);
        const box = screen.getByTestId("study-chat-input");
        expect(box.tagName).toBe("TEXTAREA");

        fireEvent.change(box, { target: { value: "First line" } });
        fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
        expect(askStudyQuestion).not.toHaveBeenCalled();

        fireEvent.change(box, { target: { value: "First line\nSecond line" } });
        fireEvent.keyDown(box, { key: "Enter" });

        await screen.findByTestId("study-answer");
        expect(askStudyQuestion).toHaveBeenCalledWith("p1", "First line\nSecond line", expect.any(Function));
    });

    /** The Enter that ends an IME composition belongs to the composition. */
    test("Enter while composing does not send", () => {
        renderWithProviders(<ChatPanel pageId="p1" initialMessages={[]} initialOverview={null} />);
        const box = screen.getByTestId("study-chat-input");

        fireEvent.change(box, { target: { value: "Pergunta" } });
        fireEvent.keyDown(box, { key: "Enter", isComposing: true });

        expect(askStudyQuestion).not.toHaveBeenCalled();
    });

    /** The room puts the returned page in the store, so notes open beside the chat merge it in. */
    test("hands the saved page to the room", async () => {
        const saved = { id: "p1", contentRevision: 8 } as never;
        vi.mocked(appendToPage).mockResolvedValue({ success: saved });
        const onSavedToPage = vi.fn();
        renderWithProviders(
            <ChatPanel pageId="p1" initialMessages={[turn.question, turn.answer]} initialOverview={null} onSavedToPage={onSavedToPage} />
        );

        fireEvent.click(screen.getByTestId("study-save-to-page"));

        await waitFor(() => expect(onSavedToPage).toHaveBeenCalledWith(saved));
        await waitFor(() => expect(screen.getByTestId("study-save-to-page")).not.toBeDisabled());
    });

    /** No citation means the tutor answered from its own knowledge; the reader is told so. */
    test("tags an answer with no citations, and only that one", () => {
        const general = { ...turn.answer, id: "a2", content: "Here is a short level test.", citations: [] };
        renderWithProviders(
            <ChatPanel pageId="p1" initialMessages={[turn.question, turn.answer, general]} initialOverview={null} />
        );

        const answers = screen.getAllByTestId("study-answer");
        expect(answers).toHaveLength(2);
        expect(answers[0].querySelector('[data-testid="study-answer-general"]')).toBeNull();
        expect(answers[1].querySelector('[data-testid="study-answer-general"]')).not.toBeNull();
    });

    describe("a diagram with the answer", () => {
        const diagram: DiagramSpec = {
            v: 1,
            kind: "FLOW",
            title: "Successor",
            nodes: [
                { id: "a", label: "Node", detail: null, tone: "ACCENT" },
                { id: "b", label: "Successor", detail: "no left child", tone: "SUCCESS" },
            ],
            links: [{ from: "a", to: "b", label: null, dashed: false }],
        };
        const drawn = { ...turn.answer, diagram };

        test("shows the card under the answer, marked as coming from the notes when the answer cites them", () => {
            const uncited = { ...drawn, id: "a2", citations: [] };
            renderWithProviders(
                <ChatPanel pageId="p1" initialMessages={[turn.question, drawn, uncited]} initialOverview={null} />
            );

            const [first, second] = screen.getAllByTestId("study-answer");
            const card = first.querySelector('[data-testid="study-diagram-card"]') as HTMLElement;
            expect(card).toHaveTextContent("Successor");
            expect(card.querySelector('svg[role="img"]')).not.toBeNull();
            expect(first.querySelector('[data-testid="study-diagram-source"]')).toHaveTextContent("DiagramFromNotes");
            expect(second.querySelector('[data-testid="study-diagram-source"]')).toHaveTextContent("DiagramFromAi");
        });

        test("an answer without a diagram has no card", () => {
            renderWithProviders(<ChatPanel pageId="p1" initialMessages={[turn.question, turn.answer]} initialOverview={null} />);

            expect(screen.queryByTestId("study-diagram-card")).toBeNull();
        });

        test("with no notes open, Save appends it on the server and hands the page to the room", async () => {
            const saved = { id: "p1", title: "Trees", contentRevision: 9 } as never;
            vi.mocked(appendDiagramToPage).mockResolvedValue({ success: saved });
            const onSavedToPage = vi.fn();
            renderWithProviders(
                <ChatPanel pageId="p1" initialMessages={[turn.question, drawn]} initialOverview={null}
                    onSavedToPage={onSavedToPage} insertIntoNotes={() => false} />
            );

            fireEvent.click(screen.getByTestId("study-diagram-save"));

            await waitFor(() => expect(appendDiagramToPage).toHaveBeenCalledWith("p1", diagram, expect.any(Function)));
            await waitFor(() => expect(onSavedToPage).toHaveBeenCalledWith(saved));
            await waitFor(() => expect(screen.getByTestId("study-diagram-save")).not.toBeDisabled());
        });

        /** Notes open beside the chat: the live editor takes the block, or its next autosave would erase a server append. */
        test("with the notes open, Save puts it into the live editor and appends nothing", () => {
            const insertIntoNotes = vi.fn((_spec: DiagramSpec) => true);
            renderWithProviders(
                <ChatPanel pageId="p1" initialMessages={[turn.question, drawn]} initialOverview={null} insertIntoNotes={insertIntoNotes} />
            );

            fireEvent.click(screen.getByTestId("study-diagram-save"));

            expect(insertIntoNotes).toHaveBeenCalledWith(diagram);
            expect(appendDiagramToPage).not.toHaveBeenCalled();
        });

        test("Adjust edits the card's diagram, and Save saves the adjusted one", async () => {
            const insertIntoNotes = vi.fn((_spec: DiagramSpec) => true);
            renderWithProviders(
                <ChatPanel pageId="p1" initialMessages={[turn.question, drawn]} initialOverview={null} insertIntoNotes={insertIntoNotes} />
            );

            fireEvent.click(screen.getByTestId("study-diagram-adjust"));
            fireEvent.change(await screen.findByTestId("diagram-box-label-0"), { target: { value: "Parent" } });
            fireEvent.click(screen.getByTestId("diagram-save"));
            await waitFor(() => expect(screen.queryByTestId("diagram-editor")).toBeNull());
            fireEvent.click(screen.getByTestId("study-diagram-save"));

            const savedSpec = insertIntoNotes.mock.calls[0][0] as DiagramSpec;
            expect(savedSpec.nodes[0].label).toBe("Parent");
            expect(screen.getByTestId("study-diagram-card")).toHaveTextContent("Parent");
        });
    });
});
