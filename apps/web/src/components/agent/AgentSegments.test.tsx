/**
 * The segments of an assistant turn: a read becomes a chip, a write becomes a card
 * with a link to the section. The link NAVIGATES AND CLOSES the panel — going to
 * check the agent's work with the chat on top covers exactly what you went to see.
 */
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/test-utils";
import AgentSegments, { destinationFor } from "./AgentSegments";
import type { agentSegment } from "@beyou/types/agent/chatType";
import type { DiagramSpec } from "@beyou/types/notebook/diagram";

vi.mock("@beyou/api/notebook", () => ({
    appendDiagramToPage: vi.fn(),
    searchPages: vi.fn(),
    getNotebookHome: vi.fn(),
    getPage: vi.fn(),
    getBoard: vi.fn(),
    getTopicTree: vi.fn(),
}));
import { appendDiagramToPage, getNotebookHome, searchPages } from "@beyou/api/notebook";

const tool = (over: Partial<agentSegment> = {}): agentSegment =>
    ({ type: "tool", tool: "createRoutine", status: "finished", ...over }) as agentSegment;

test("a read tool stays a chip, with no link", () => {
    renderWithProviders(
        <AgentSegments segments={[tool({ tool: "getUserRoutines" })]} onInternalLink={vi.fn()} />
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("a write tool becomes a card that links to its section", () => {
    renderWithProviders(<AgentSegments segments={[tool()]} onInternalLink={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Routines/i })).toBeInTheDocument();
});

test("the card link hands the route to the panel, which closes it", async () => {
    const onInternalLink = vi.fn();
    renderWithProviders(<AgentSegments segments={[tool()]} onInternalLink={onInternalLink} />);

    await userEvent.click(screen.getByRole("button", { name: /Routines/i }));

    expect(onInternalLink).toHaveBeenCalledWith("/routines");
});

test("a failed write stays a chip — there is nothing to go and see", () => {
    renderWithProviders(
        <AgentSegments segments={[tool({ error: "boom" })]} onInternalLink={vi.fn()} />
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("an in-flight write stays a chip until it finishes", () => {
    renderWithProviders(
        <AgentSegments segments={[tool({ status: "started" })]} onInternalLink={vi.fn()} />
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("a markdown internal link routes through the same handler", async () => {
    const onInternalLink = vi.fn();
    renderWithProviders(
        <AgentSegments
            segments={[{ type: "text", text: "veja [suas rotinas](/routines)" } as agentSegment]}
            onInternalLink={onInternalLink}
        />
    );

    await userEvent.click(screen.getByRole("link", { name: "suas rotinas" }));

    expect(onInternalLink).toHaveBeenCalledWith("/routines");
});

describe("destinationFor", () => {
    it("routes each domain to its own section", () => {
        expect(destinationFor("createHabit")?.route).toBe("/habits");
        expect(destinationFor("editCategory")?.route).toBe("/categories");
        expect(destinationFor("createTask")?.route).toBe("/tasks");
        expect(destinationFor("completeGoal")?.route).toBe("/goals");
        expect(destinationFor("createRoutine")?.route).toBe("/routines");
    });

    it("sends two-entity tools to the routine, not to the first regex that matches", () => {
        // `addTaskToRoutineSection` would match /Task/ first, and what you want to
        // check is the routine the task went into.
        expect(destinationFor("addTaskToRoutineSection")?.route).toBe("/routines");
        expect(destinationFor("addHabitToRoutineSection")?.route).toBe("/routines");
    });

    it("sends micro-task writes to the focus screen, not to the tasks page", () => {
        // Every one of these has "Task" in its name and none of them is about a task.
        // `/Task/` matched them all and the card offered a trip to /tasks to look for
        // something that was never going to be there.
        for (const tool of [
            "addMicroTask",
            "toggleMicroTask",
            "pinMicroTask",
            "deleteMicroTask",
            "reorderMicroTasks",
        ]) {
            expect(destinationFor(tool)?.route).toBe("/focus");
        }
    });

    it("has no destination for tools without a screen", () => {
        expect(destinationFor("updateGlobalContext")).toBeNull();
        expect(destinationFor(undefined)).toBeNull();
        // A read is a chip, so it has nothing to open either.
        expect(destinationFor("getItemMicroTasks")).toBeNull();
        expect(destinationFor("getFocusDay")).toBeNull();
    });
});

describe("diagram tools", () => {
    const diagram: DiagramSpec = {
        v: 1,
        kind: "CYCLE",
        title: "Build, measure, learn",
        nodes: [
            { id: "n1", label: "Build", detail: null, tone: "ACCENT" },
            { id: "n2", label: "Measure", detail: null, tone: "NEUTRAL" },
            { id: "n3", label: "Learn", detail: null, tone: "SUCCESS" },
        ],
        links: [],
    };

    test("showDiagram draws the diagram inline, from the AI's own knowledge, with no plain chip", () => {
        renderWithProviders(<AgentSegments segments={[tool({ tool: "showDiagram", diagram })]} onInternalLink={vi.fn()} />);

        const card = screen.getByTestId("agent-diagram-card");
        expect(card).toHaveTextContent("Build, measure, learn");
        expect(screen.getByRole("img")).toHaveAttribute("aria-label", expect.stringContaining("Build; Measure; Learn"));
        expect(screen.getByTestId("agent-diagram-source")).toHaveTextContent("DiagramFromAi");
        expect(screen.queryByText("AgentTool.showDiagram")).toBeNull();
    });

    test("Save to notebook finds a page and appends the diagram to it", async () => {
        vi.mocked(searchPages).mockResolvedValue({
            success: [{ id: "p9", title: "Lean startup", icon: null, kind: "PAGE", topicId: "t1", topicTitle: "Product" }],
        });
        vi.mocked(appendDiagramToPage).mockResolvedValue({ success: { id: "p9", title: "Lean startup" } as never });
        vi.mocked(getNotebookHome).mockResolvedValue({ success: undefined });
        renderWithProviders(<AgentSegments segments={[tool({ tool: "showDiagram", diagram })]} onInternalLink={vi.fn()} />);

        fireEvent.click(screen.getByTestId("agent-diagram-save"));
        fireEvent.change(screen.getByTestId("diagram-page-search"), { target: { value: "lean" } });
        fireEvent.click(await screen.findByTestId("diagram-page-option"));

        await waitFor(() => expect(appendDiagramToPage).toHaveBeenCalledWith("p9", diagram, expect.any(Function)));
        await waitFor(() => expect(screen.queryByTestId("diagram-page-picker")).toBeNull());
    });

    test("addStudyDiagram is a card with a preview, the page's name and the way there", async () => {
        const onInternalLink = vi.fn();
        renderWithProviders(
            <AgentSegments
                segments={[tool({ tool: "addStudyDiagram", diagram, pageId: "p9", pageTitle: "Lean startup" })]}
                onInternalLink={onInternalLink}
            />
        );

        const card = screen.getByTestId("agent-diagram-added");
        expect(card).toHaveTextContent("DiagramToolAdded");
        expect(card.querySelector('svg[role="img"]')).not.toBeNull();

        await userEvent.click(screen.getByTestId("agent-diagram-open"));
        expect(onInternalLink).toHaveBeenCalledWith("/notebook/p9");
    });

    test("a diagram tool still running, or one that failed, stays a chip", () => {
        renderWithProviders(
            <AgentSegments segments={[tool({ tool: "showDiagram", status: "started" }), tool({ tool: "addStudyDiagram", error: "no page" })]} />
        );

        expect(screen.queryByTestId("agent-diagram-card")).toBeNull();
        expect(screen.queryByTestId("agent-diagram-added")).toBeNull();
        expect(screen.getByText("AgentTool.showDiagram")).toBeInTheDocument();
    });
});

