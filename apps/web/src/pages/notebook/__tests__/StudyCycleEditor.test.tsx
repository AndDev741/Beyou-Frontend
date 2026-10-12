import { fireEvent, screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { NotebookHome, TopicSummary } from "@beyou/types/notebook/notebook";
import type { PlanResponse } from "@beyou/types/notebook/studyCycle";
import { renderWithProviders } from "../../../test/test-utils";
import {
    cycle, lap, makeStore, notebookHome, softwareEngineer, today, topic, tree, treesById,
} from "../../../components/notebook/cycles/__tests__/fixtures";

vi.mock("@beyou/api/notebook", () => ({
    getNotebookHome: vi.fn(),
    getTopicTree: vi.fn(),
    getStudyCycles: vi.fn(),
    getStudyCycle: vi.fn(),
    getStudyToday: vi.fn(),
    planStudyCycle: vi.fn(),
    createStudyCycle: vi.fn(),
    updateStudyCycle: vi.fn(),
}));

import {
    createStudyCycle, getNotebookHome, getStudyCycle, getStudyCycles, getStudyToday, getTopicTree, planStudyCycle, updateStudyCycle,
} from "@beyou/api/notebook";
import StudyCycleEditor from "../StudyCycleEditor";

const summary = (id: string, title: string): TopicSummary => ({
    id, title, icon: null, description: null, progress: { done: 0, total: 4 }, cardsDue: 0, sourcesCount: 0, next: null,
    goal: null, habit: null, preview: [], previewEdges: [], updatedAt: "2026-10-01T00:00:00Z",
});
const home: NotebookHome = {
    topics: [summary("const", "Dir. Constitucional"), summary("port", "Português"), summary("info", "Informática")],
    continueStudying: null,
    review: { due: 0, byTopic: [], streak: 0 },
};
/** Another active cycle holds Informática. */
const faculdade = cycle({
    id: "fac", name: "Faculdade",
    topics: [{ topicId: "info", importance: 3, mastery: 3, minutesOverride: null, topic: topic("info", "Informática") }],
});

const plan = (blocks: { topicId: string; plannedMinutes: number }[]): PlanResponse => ({
    weekMinutes: 570, plannedMinutes: blocks.reduce((sum, b) => sum + b.plannedMinutes, 0), lapDays: 7,
    topics: [...new Set(blocks.map((b) => b.topicId))].map((topicId) => ({
        topicId, weight: 9, share: 0.5, suggestedMinutes: 285, minutes: 285, blocks: blocks.filter((b) => b.topicId === topicId).length,
    })),
    blocks: blocks.map((b, i) => ({ position: i + 1, ...b })),
});

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((r) => { resolve = r; });
    return { promise, resolve };
}

function renderEditor(route: string) {
    return renderWithProviders(
        <Routes>
            <Route path="/notebook/cycles" element={<div data-testid="cycles-page" />} />
            <Route path="/notebook/cycles/new" element={<StudyCycleEditor />} />
            <Route path="/notebook/cycles/:cycleId/edit" element={<StudyCycleEditor />} />
        </Routes>,
        { route, storeOverride: makeStore() },
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getNotebookHome).mockResolvedValue({ success: home });
    vi.mocked(getTopicTree).mockImplementation(treesById(
        tree("const", "Dir. Constitucional"), tree("port", "Português"), tree("info", "Informática"),
    ));
    vi.mocked(getStudyCycles).mockResolvedValue({ success: [{ id: "fac", name: "Faculdade", position: 0, lap: lap(), today: { minutes: 60, startTime: null } }] });
    vi.mocked(getStudyCycle).mockResolvedValue({ success: faculdade });
    vi.mocked(getStudyToday).mockResolvedValue({ success: today() });
});

const addTopic = (id: string) => fireEvent.change(screen.getByTestId("cycle-add-topic"), { target: { value: id } });

describe("StudyCycleEditor", () => {
    test("asks the server for the plan once the changes settle, and saves the cycle it previewed", async () => {
        vi.mocked(planStudyCycle).mockResolvedValue({
            success: plan([{ topicId: "const", plannedMinutes: 90 }, { topicId: "port", plannedMinutes: 90 }, { topicId: "const", plannedMinutes: 85 }]),
        });
        vi.mocked(createStudyCycle).mockResolvedValue({ success: cycle({ id: "new1" }) });
        renderEditor("/notebook/cycles/new");

        await screen.findByRole("option", { name: "Português" });
        fireEvent.change(screen.getByTestId("cycle-name"), { target: { value: "  Concurso TRT " } });
        addTopic("const");
        addTopic("port");

        // Two changes in a row, one question: the editor waits for the last one.
        expect(await screen.findAllByTestId("cycle-plan-block")).toHaveLength(3);
        expect(planStudyCycle).toHaveBeenCalledTimes(1);
        const asked = vi.mocked(planStudyCycle).mock.calls[0][0];
        expect(asked.topics.map((t) => t.topicId)).toEqual(["const", "port"]);
        expect(asked.days).toHaveLength(7);
        expect(asked.maxBlockMinutes).toBe(90);

        fireEvent.click(screen.getByTestId("cycle-save"));

        expect(await screen.findByTestId("cycles-page")).toBeInTheDocument();
        expect(createStudyCycle).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "Concurso TRT",
                defaultMode: "GOAL",
                maxBlockMinutes: 90,
                topics: [
                    { topicId: "const", importance: 3, mastery: 3, minutesOverride: null },
                    { topicId: "port", importance: 3, mastery: 3, minutesOverride: null },
                ],
            }),
            expect.any(Function),
        );
    });

    test("drops a slow answer to an older question", async () => {
        const first = deferred<Awaited<ReturnType<typeof planStudyCycle>>>();
        const second = deferred<Awaited<ReturnType<typeof planStudyCycle>>>();
        vi.mocked(planStudyCycle).mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
        renderEditor("/notebook/cycles/new");

        await screen.findByRole("option", { name: "Português" });
        addTopic("const");
        await waitFor(() => expect(planStudyCycle).toHaveBeenCalledTimes(1));
        addTopic("port");
        await waitFor(() => expect(planStudyCycle).toHaveBeenCalledTimes(2));

        second.resolve({ success: plan([{ topicId: "const", plannedMinutes: 90 }, { topicId: "port", plannedMinutes: 90 }]) });
        expect(await screen.findAllByTestId("cycle-plan-block")).toHaveLength(2);
        first.resolve({ success: plan([{ topicId: "const", plannedMinutes: 60 }]) });
        await new Promise((r) => setTimeout(r, 20));
        expect(screen.getAllByTestId("cycle-plan-block")).toHaveLength(2);
    });

    test("marks a topic another cycle holds, and shows the server's refusal if it gets through", async () => {
        vi.mocked(planStudyCycle).mockResolvedValue({ success: plan([{ topicId: "const", plannedMinutes: 90 }]) });
        vi.mocked(createStudyCycle).mockResolvedValue({ error: { errorKey: "STUDY_CYCLE_TOPIC_TAKEN" } });
        renderEditor("/notebook/cycles/new");

        const held = () => screen.getByTestId("cycle-add-topic").querySelector<HTMLOptionElement>('option[value="info"]');
        await waitFor(() => expect(held()).toBeDisabled());
        expect(held()).toHaveTextContent("StudyCycleTopicTakenOption");
        fireEvent.change(screen.getByTestId("cycle-name"), { target: { value: "Concurso" } });
        addTopic("const");
        fireEvent.click(screen.getByTestId("cycle-save"));

        expect(await screen.findByText(/STUDY_CYCLE_TOPIC_TAKEN/)).toBeInTheDocument();
        expect(screen.queryByTestId("cycles-page")).not.toBeInTheDocument();
    });

    test("offers the pages inside each topic and closes whatever overlaps a subject", async () => {
        vi.mocked(getNotebookHome).mockResolvedValue({
            success: notebookHome([{ id: "se", title: "Software Engineer" }, { id: "es", title: "Espanhol C1" }]),
        });
        vi.mocked(getTopicTree).mockImplementation(treesById(softwareEngineer, tree("es", "Espanhol C1")));
        // Another cycle holds Testes, a page inside Implementação 2.0.
        vi.mocked(getStudyCycle).mockResolvedValue({
            success: cycle({
                id: "fac", name: "Faculdade",
                topics: [{ topicId: "testes", importance: 3, mastery: 3, minutesOverride: null, topic: topic("testes", "Testes", "Software Engineer") }],
            }),
        });
        vi.mocked(planStudyCycle).mockResolvedValue({ success: plan([{ topicId: "fund", plannedMinutes: 90 }]) });
        vi.mocked(createStudyCycle).mockResolvedValue({ success: cycle({ id: "new1" }) });
        renderEditor("/notebook/cycles/new");

        const select = () => screen.getByTestId("cycle-add-topic");
        const option = (id: string) => select().querySelector<HTMLOptionElement>(`option[value="${id}"]`)!;
        // Depth first in sidebar order, each root followed by its pages.
        await waitFor(() => expect(option("testes")).toBeDisabled());
        expect([...select().querySelectorAll("option")].map((o) => o.value)).toEqual(["", "se", "fund", "redes", "impl", "testes", "es"]);
        // A root keeps its plain title; a page is indented under it and named with its root.
        expect(option("es").label).toBe("Espanhol C1");
        expect(option("fund").textContent).toBe("\u00a0\u00a0\u00a0Fundamentos da Computação");
        expect(screen.getByRole("option", { name: "Software Engineer › Fundamentos da Computação" })).toBe(option("fund"));
        // The held page, the page above it and the root above both are closed, with the reason.
        expect(option("testes")).toHaveTextContent("StudyCycleTopicTakenOption");
        expect(option("impl")).toHaveTextContent("StudyCycleSubjectNearTakenOption");
        expect(option("se")).toBeDisabled();
        expect(option("fund")).not.toBeDisabled();

        fireEvent.change(screen.getByTestId("cycle-name"), { target: { value: "Carreira" } });
        fireEvent.change(select(), { target: { value: "fund" } });

        const row = await screen.findByTestId("cycle-topic-row");
        expect(row).toHaveTextContent("Software Engineer › Fundamentos da Computação");
        expect(option("fund")).toBeDisabled();
        expect(option("fund")).toHaveTextContent("StudyCycleSubjectPickedOption");
        expect(option("redes")).toHaveTextContent("StudyCycleSubjectOverlapOption");
        expect(option("es")).not.toBeDisabled();

        await screen.findAllByTestId("cycle-plan-block");
        fireEvent.click(screen.getByTestId("cycle-save"));
        await screen.findByTestId("cycles-page");
        expect(vi.mocked(createStudyCycle).mock.calls[0][0].topics.map((topic) => topic.topicId)).toEqual(["fund"]);
    });

    test("edits a saved cycle from what it holds, an override sent as typed and clamped", async () => {
        const trt = cycle();
        vi.mocked(getStudyCycle).mockImplementation(async (id) => ({ success: id === "trt" ? trt : faculdade }));
        vi.mocked(planStudyCycle).mockResolvedValue({ success: plan([{ topicId: "adm", plannedMinutes: 75 }, { topicId: "port", plannedMinutes: 75 }]) });
        vi.mocked(updateStudyCycle).mockResolvedValue({ success: trt });
        renderEditor("/notebook/cycles/trt/edit");

        expect(await screen.findByDisplayValue("Concurso TRT")).toBeInTheDocument();
        expect(screen.getAllByTestId("cycle-topic-row")).toHaveLength(2);
        await screen.findAllByTestId("cycle-plan-block");

        const [admMinutes] = screen.getAllByTestId("topic-minutes");
        fireEvent.change(admMinutes, { target: { value: "700" } });
        fireEvent.blur(admMinutes);
        fireEvent.click(screen.getAllByTestId("topic-importance-up")[0]);
        fireEvent.click(screen.getByTestId("cycle-save"));

        await screen.findByTestId("cycles-page");
        expect(updateStudyCycle).toHaveBeenCalledWith(
            "trt",
            expect.objectContaining({
                topics: [
                    { topicId: "adm", importance: 5, mastery: 2, minutesOverride: 600 },
                    { topicId: "port", importance: 5, mastery: 3, minutesOverride: null },
                ],
            }),
            expect.any(Function),
        );
    });
});
