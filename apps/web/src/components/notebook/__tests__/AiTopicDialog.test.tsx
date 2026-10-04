import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
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

describe("AiTopicDialog", () => {
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
