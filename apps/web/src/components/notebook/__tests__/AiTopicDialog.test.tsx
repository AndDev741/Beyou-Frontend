import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders } from "../../../test/test-utils";
import type { RoadmapDraftRecord } from "@beyou/types/notebook/notebook";

vi.mock("@beyou/api/notebook", () => ({
    startRoadmapDraft: vi.fn(),
    redraftRoadmap: vi.fn(),
    getRoadmapDraft: vi.fn(),
    saveDraftChoices: vi.fn(),
    createTopicFromDraft: vi.fn(),
}));
vi.mock("@beyou/api/goals/getGoals", () => ({ default: vi.fn() }));

import { createTopicFromDraft, getRoadmapDraft, saveDraftChoices, startRoadmapDraft } from "@beyou/api/notebook";
import getGoals from "@beyou/api/goals/getGoals";
import AiTopicDialog, { DRAFT_POLL_MS } from "../AiTopicDialog";

const NODES = [
    { title: "Discrete Math", why: "Proofs.", subtopics: ["Logic", "Sets"], estimatedHours: 18, optional: false,
        existingPageId: null, existingTopicTitle: null, existingProgress: null },
    { title: "Operating Systems", why: "Processes.", subtopics: ["Threads"], estimatedHours: 20, optional: false,
        existingPageId: "os-page", existingTopicTitle: "Software Engineering", existingProgress: { done: 1, total: 6 } },
    { title: "Compilers", why: "Optional.", subtopics: [], estimatedHours: 18, optional: true,
        existingPageId: null, existingTopicTitle: null, existingProgress: null },
];

const record = (patch: Partial<RoadmapDraftRecord> = {}): RoadmapDraftRecord => ({
    id: "draft-1",
    title: "Fundamentals of CS",
    status: "READY",
    request: { title: "Fundamentals of CS", why: "Interviews", level: "SOLID", hoursPerWeek: 10 },
    result: { nodes: NODES, totalHours: 38 },
    choices: null,
    errorKey: null,
    startedAt: "2026-10-05T10:00:00Z",
    createdAt: "2026-10-05T10:00:00Z",
    updatedAt: "2026-10-05T10:00:30Z",
    ...patch,
});

beforeEach(() => {
    vi.clearAllMocks();
    // The config resets mocks before every test, so the stubs live here, not in the factory.
    vi.mocked(getGoals).mockResolvedValue({ success: [] } as never);
    vi.mocked(startRoadmapDraft).mockResolvedValue({ success: record() });
    vi.mocked(getRoadmapDraft).mockResolvedValue({ success: record() });
    vi.mocked(saveDraftChoices).mockResolvedValue({ success: record() });
    vi.mocked(createTopicFromDraft).mockResolvedValue({ success: { id: "new-topic" } as never });
});

afterEach(() => {
    vi.useRealTimers();
});

const startDraft = async (title = "Fundamentals of CS") => {
    fireEvent.change(screen.getByTestId("ai-topic-what"), { target: { value: title } });
    await act(async () => { fireEvent.click(screen.getByTestId("ai-topic-draft")); });
};

describe("AiTopicDialog", () => {
    /**
     * Nothing is created until the person accepts; what they accept is what they saw: optional
     * nodes start unticked, and a node they already have is sent as a link, not a copy. The
     * draft it came from goes along so the server can delete it.
     */
    test("creates only the kept nodes, linking the one that already exists", async () => {
        renderWithProviders(<AiTopicDialog isOpen onClose={() => {}} />);

        await startDraft();

        expect(screen.getAllByTestId("ai-draft-node")).toHaveLength(3);
        expect(createTopicFromDraft).not.toHaveBeenCalled();
        await act(async () => { fireEvent.click(screen.getByTestId("ai-topic-create")); });

        expect(createTopicFromDraft).toHaveBeenCalledWith(
            expect.objectContaining({
                title: "Fundamentals of CS",
                draftId: "draft-1",
                nodes: [
                    expect.objectContaining({ title: "Discrete Math", subtopics: ["Logic", "Sets"], linkPageId: null }),
                    expect.objectContaining({ title: "Operating Systems", subtopics: [], linkPageId: "os-page" }),
                ],
            }),
            expect.any(Function)
        );
    });

    /**
     * A draft can take over a minute, and it may have started before the dialog opened. The
     * panel says what is being drafted and counts from when the call began on the server, and
     * past 30 seconds it says it is still going.
     */
    test("while the model writes, the panel shows what and for how long", async () => {
        vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval", "setTimeout", "clearTimeout"] });
        vi.setSystemTime(new Date("2026-10-05T10:00:40Z"));
        vi.mocked(startRoadmapDraft).mockResolvedValue({ success: record({ status: "DRAFTING", result: null }) });
        renderWithProviders(<AiTopicDialog isOpen onClose={() => {}} />);

        await startDraft();

        const waiting = screen.getByTestId("ai-draft-waiting");
        expect(waiting).toHaveTextContent("NotebookAiWaitDrafting");
        expect(screen.getByTestId("ai-waiting-elapsed")).toHaveTextContent("0:40");
        expect(screen.getByTestId("ai-waiting-slow")).toHaveTextContent("NotebookAiWaitSlow");
        expect(screen.getByTestId("ai-draft-saved")).toHaveTextContent("NotebookAiDraftSaved");
    });

    test("reads a draft back until the model has written it", async () => {
        vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout"] });
        vi.mocked(startRoadmapDraft).mockResolvedValue({ success: record({ status: "DRAFTING", result: null }) });
        vi.mocked(getRoadmapDraft).mockResolvedValue({ success: record() });
        const onDraftsChanged = vi.fn();
        renderWithProviders(<AiTopicDialog isOpen onClose={() => {}} onDraftsChanged={onDraftsChanged} />);

        await startDraft();
        expect(screen.queryAllByTestId("ai-draft-node")).toHaveLength(0);

        await act(async () => { vi.advanceTimersByTime(DRAFT_POLL_MS); });

        expect(getRoadmapDraft).toHaveBeenCalledWith("draft-1", expect.any(Function));
        expect(screen.getAllByTestId("ai-draft-node")).toHaveLength(3);
        expect(screen.queryByTestId("ai-draft-waiting")).toBeNull();
        expect(onDraftsChanged).toHaveBeenCalled();
    });

    /** Reported from local testing: a click outside lost a finished draft. Now it reopens as it was. */
    test("a stored draft reopens with its form, its nodes and the ticks the person set", async () => {
        vi.mocked(getRoadmapDraft).mockResolvedValue({
            success: record({ choices: [{ keep: false, link: false }, { keep: true, link: false }, { keep: true, link: false }] }),
        });

        await act(async () => { renderWithProviders(<AiTopicDialog isOpen onClose={() => {}} draftId="draft-1" />); });

        expect(screen.getByTestId("ai-topic-what")).toHaveValue("Fundamentals of CS");
        const [math, os, compilers] = screen.getAllByTestId("ai-draft-node");
        expect(math.querySelector("input[type=checkbox]")).not.toBeChecked();
        expect(os).toHaveTextContent("NotebookAiNodeMeta");
        expect(compilers.querySelector("input[type=checkbox]")).toBeChecked();
    });

    /** A tick waits a moment before it is saved, and closing saves the one still waiting. */
    test("closing saves a tick that was still waiting to be saved", async () => {
        const onClose = vi.fn();
        await act(async () => { renderWithProviders(<AiTopicDialog isOpen onClose={onClose} draftId="draft-1" />); });

        fireEvent.click(screen.getAllByTestId("ai-draft-node")[0].querySelector("input[type=checkbox]")!);
        expect(saveDraftChoices).not.toHaveBeenCalled();
        fireEvent.click(screen.getByText("Close"));

        expect(saveDraftChoices).toHaveBeenCalledWith("draft-1",
            [{ keep: false, link: false }, { keep: true, link: true }, { keep: false, link: false }], expect.any(Function));
        expect(onClose).toHaveBeenCalled();
    });
});
