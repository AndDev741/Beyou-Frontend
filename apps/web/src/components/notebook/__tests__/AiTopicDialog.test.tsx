import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders } from "../../../test/test-utils";

vi.mock("@beyou/api/notebook", () => ({
    draftRoadmap: vi.fn(),
    createTopicFromDraft: vi.fn(),
}));
vi.mock("@beyou/api/goals/getGoals", () => ({ default: vi.fn() }));

import { createTopicFromDraft, draftRoadmap } from "@beyou/api/notebook";
import getGoals from "@beyou/api/goals/getGoals";
import AiTopicDialog from "../AiTopicDialog";

beforeEach(() => {
    vi.clearAllMocks();
    // The config resets mocks before every test, so the stub lives here, not in the factory.
    vi.mocked(getGoals).mockResolvedValue({ success: [] } as never);
    vi.mocked(draftRoadmap).mockResolvedValue({
        success: {
            totalHours: 38,
            nodes: [
                { title: "Discrete Math", why: "Proofs.", subtopics: ["Logic", "Sets"], estimatedHours: 18, optional: false,
                    existingPageId: null, existingTopicTitle: null, existingProgress: null },
                { title: "Operating Systems", why: "Processes.", subtopics: ["Threads"], estimatedHours: 20, optional: false,
                    existingPageId: "os-page", existingTopicTitle: "Software Engineering", existingProgress: { done: 1, total: 6 } },
                { title: "Compilers", why: "Optional.", subtopics: [], estimatedHours: 18, optional: true,
                    existingPageId: null, existingTopicTitle: null, existingProgress: null },
            ],
        },
    });
    vi.mocked(createTopicFromDraft).mockResolvedValue({ success: { id: "new-topic" } as never });
});

afterEach(() => {
    vi.useRealTimers();
});

/** A draft that answers only when the test says so. */
function heldDraft() {
    let answer!: (value: Awaited<ReturnType<typeof draftRoadmap>>) => void;
    vi.mocked(draftRoadmap).mockReturnValue(new Promise((resolve) => { answer = resolve; }));
    return (value: Awaited<ReturnType<typeof draftRoadmap>>) => answer(value);
}

const ONE_NODE = {
    success: {
        totalHours: 18,
        nodes: [{ title: "Discrete Math", why: "Proofs.", subtopics: [], estimatedHours: 18, optional: false,
            existingPageId: null, existingTopicTitle: null, existingProgress: null }],
    },
};

describe("AiTopicDialog", () => {
    /**
     * A draft can take over a minute. A button label alone looks the same at second 3 and at
     * second 70, so the panel says what is being drafted, counts the time, shows where the nodes
     * will land, and past 30 seconds says it is still waiting and for how long it will.
     */
    test("while drafting, the panel shows what, for how long, and that it is still going", () => {
        vi.useFakeTimers();
        heldDraft();
        renderWithProviders(<AiTopicDialog isOpen onClose={() => {}} />);

        fireEvent.change(screen.getByTestId("ai-topic-what"), { target: { value: "Software Engineering" } });
        fireEvent.click(screen.getByTestId("ai-topic-draft"));

        const waiting = screen.getByTestId("ai-draft-waiting");
        expect(waiting).toHaveTextContent("NotebookAiWaitDrafting");
        expect(waiting).toHaveTextContent("NotebookAiWaitUsual");
        expect(screen.getByTestId("ai-waiting-elapsed")).toHaveTextContent("0:00");
        expect(screen.queryByText("NotebookAiDraftEmpty")).toBeNull();

        act(() => { vi.advanceTimersByTime(31_000); });

        expect(screen.getByTestId("ai-waiting-elapsed")).toHaveTextContent("0:31");
        expect(screen.getByTestId("ai-waiting-slow")).toHaveTextContent("NotebookAiWaitSlow");
    });

    /** Stop gives the form back at once. The server cannot be stopped, so its late answer is dropped. */
    test("Stop returns to the form and a late answer does not show up", async () => {
        const answer = heldDraft();
        renderWithProviders(<AiTopicDialog isOpen onClose={() => {}} />);

        fireEvent.change(screen.getByTestId("ai-topic-what"), { target: { value: "Software Engineering" } });
        fireEvent.click(screen.getByTestId("ai-topic-draft"));
        fireEvent.click(screen.getByTestId("ai-draft-stop"));

        expect(screen.queryByTestId("ai-draft-waiting")).toBeNull();
        expect(screen.getByText("NotebookAiDraftEmpty")).toBeInTheDocument();
        expect(screen.getByTestId("ai-topic-draft")).not.toBeDisabled();

        await act(async () => { answer(ONE_NODE as never); });

        expect(screen.queryAllByTestId("ai-draft-node")).toHaveLength(0);
    });

    /**
     * Nothing is created until the person accepts; what they accept is what they saw: optional
     * nodes start unticked, and a node they already have is sent as a link, not a copy.
     */
    test("creates only the kept nodes, linking the one that already exists", async () => {
        renderWithProviders(<AiTopicDialog isOpen onClose={() => {}} />);

        fireEvent.change(screen.getByTestId("ai-topic-what"), { target: { value: "Fundamentals of CS" } });
        fireEvent.click(screen.getByTestId("ai-topic-draft"));

        expect(await screen.findAllByTestId("ai-draft-node")).toHaveLength(3);
        expect(createTopicFromDraft).not.toHaveBeenCalled();
        fireEvent.click(screen.getByTestId("ai-topic-create"));

        await screen.findByTestId("ai-topic-dialog");
        expect(createTopicFromDraft).toHaveBeenCalledWith(
            expect.objectContaining({
                title: "Fundamentals of CS",
                nodes: [
                    expect.objectContaining({ title: "Discrete Math", subtopics: ["Logic", "Sets"], linkPageId: null }),
                    expect.objectContaining({ title: "Operating Systems", subtopics: [], linkPageId: "os-page" }),
                ],
            }),
            expect.any(Function)
        );
    });
});
