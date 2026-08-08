/**
 * Os segmentos de um turno do assistente: leitura vira chip, escrita vira
 * cartão com link para a seção. O link NAVEGA E FECHA o painel — ir conferir o
 * que o agente fez com o chat por cima cobre exatamente o que se foi ver.
 */
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/test-utils";
import AgentSegments, { destinationFor } from "./AgentSegments";
import type { agentSegment } from "@beyou/types/agent/chatType";

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
        // `addTaskToRoutineSection` casaria /Task/ primeiro, e o que a pessoa
        // quer conferir é a rotina onde a tarefa entrou.
        expect(destinationFor("addTaskToRoutineSection")?.route).toBe("/routines");
        expect(destinationFor("addHabitToRoutineSection")?.route).toBe("/routines");
    });

    it("has no destination for tools without a screen", () => {
        expect(destinationFor("updateGlobalContext")).toBeNull();
        expect(destinationFor(undefined)).toBeNull();
    });
});
