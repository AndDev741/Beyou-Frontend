import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { StudyCycleSummary } from "@beyou/types/notebook/studyCycle";
import { renderWithProviders } from "../../../test/test-utils";
import {
    block, cycle, entry, lap, makeStore, notebookHome, today, todayCycle, topic,
} from "../../../components/notebook/cycles/__tests__/fixtures";

vi.mock("@beyou/api/notebook", () => ({
    getNotebookHome: vi.fn(),
    getStudyCycles: vi.fn(),
    getStudyCycle: vi.fn(),
    getStudyToday: vi.fn(),
    getTopicTree: vi.fn(),
    replaceStudyBlocks: vi.fn(),
    archiveStudyCycle: vi.fn(),
    updateStudyBlock: vi.fn(),
}));

import {
    archiveStudyCycle, getNotebookHome, getStudyCycle, getStudyCycles, getStudyToday, getTopicTree, replaceStudyBlocks,
} from "@beyou/api/notebook";
import StudyCycles from "../StudyCycles";

const summary = (id: string, name: string): StudyCycleSummary => ({ id, name, position: 0, lap: lap(), today: { minutes: 180, startTime: "19:00" } });
const trt = cycle();

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStudyCycles).mockResolvedValue({ success: [summary("trt", "Concurso TRT"), summary("fac", "Faculdade")] });
    vi.mocked(getStudyCycle).mockImplementation(async (id) => ({ success: id === "trt" ? trt : cycle({ id: "fac", name: "Faculdade", blocks: [block("f1", "calc", 1)] }) }));
    vi.mocked(getStudyToday).mockResolvedValue({
        success: today({ cycles: [todayCycle({ entries: [entry({ blockId: "b2", position: 2, topic: { id: "port", title: "port", icon: null }, minutesToday: 40 }), entry({ blockId: "b3", position: 3 })] })] }),
    });
    vi.mocked(getTopicTree).mockResolvedValue({ success: { topic: { id: "port", title: "Português", icon: null }, items: [], sourcesCount: 0, cardsDue: 0 } });
    vi.mocked(getNotebookHome).mockResolvedValue({ success: notebookHome([{ id: "port", title: "Português" }]) });
});

describe("StudyCycles", () => {
    test("lists the lap's blocks with their state and today's badges", async () => {
        renderWithProviders(<StudyCycles />, { route: "/notebook/cycles", storeOverride: makeStore() });

        const blocks = await screen.findAllByTestId("cycle-block");
        expect(blocks.map((b) => b.dataset.state)).toEqual(["DONE", "OPEN", "OPEN"]);
        // Block 2 is what the day is on, and only takes 40 of its 75 minutes today.
        expect(blocks[1]).toHaveTextContent("StudyCycleBadgeNext");
        expect(blocks[2]).toHaveTextContent("StudyCycleBadgeToday");
        expect(screen.getAllByTestId("cycle-chip")).toHaveLength(2);
        expect(screen.getByTestId("cycle-history")).toHaveAttribute("href", "/notebook/cycles/trt/history");
        expect(screen.getByTestId("cycle-edit")).toHaveAttribute("href", "/notebook/cycles/trt/edit");
    });

    test("moves a block down by sending the whole order back", async () => {
        vi.mocked(replaceStudyBlocks).mockResolvedValue({ success: trt });
        renderWithProviders(<StudyCycles />, { route: "/notebook/cycles", storeOverride: makeStore() });

        const blocks = await screen.findAllByTestId("cycle-block");
        expect(within(blocks[0]).getByTestId("cycle-block-up")).toBeDisabled();
        fireEvent.click(within(blocks[0]).getByTestId("cycle-block-down"));

        await waitFor(() => expect(replaceStudyBlocks).toHaveBeenCalled());
        const [cycleId, order] = vi.mocked(replaceStudyBlocks).mock.calls[0];
        expect(cycleId).toBe("trt");
        expect(order.map((b) => b.id)).toEqual(["b2", "b1", "b3"]);
    });

    test("switches cycle from the chips", async () => {
        renderWithProviders(<StudyCycles />, { route: "/notebook/cycles", storeOverride: makeStore() });

        await screen.findAllByTestId("cycle-block");
        fireEvent.click(screen.getAllByTestId("cycle-chip")[1]);

        await waitFor(() => expect(screen.getAllByTestId("cycle-block")).toHaveLength(1));
        expect(getStudyCycle).toHaveBeenCalledWith("fac", expect.any(Function));
    });

    test("puts a nested subject's root, small, in front of its name", async () => {
        const nested = cycle({
            blocks: [
                block("b1", "impl", 1, { topic: topic("impl", "Implementação 2.0", "Software Engineer") }),
                block("b2", "port", 2, { topic: topic("port", "Português") }),
            ],
        });
        vi.mocked(getStudyCycle).mockResolvedValue({ success: nested });
        renderWithProviders(<StudyCycles />, { route: "/notebook/cycles?cycle=trt", storeOverride: makeStore() });

        const blocks = await screen.findAllByTestId("cycle-block");
        expect(within(blocks[0]).getByTestId("subject-root")).toHaveTextContent("Software Engineer ›");
        expect(blocks[0]).toHaveTextContent("Implementação 2.0");
        expect(within(blocks[1]).queryByTestId("subject-root")).not.toBeInTheDocument();
    });

    test("opens a block's dialog from its row", async () => {
        renderWithProviders(<StudyCycles />, { route: "/notebook/cycles", storeOverride: makeStore() });

        const blocks = await screen.findAllByTestId("cycle-block");
        fireEvent.click(within(blocks[1]).getByTestId("cycle-block-open"));

        expect(await screen.findByTestId("block-dialog")).toBeInTheDocument();
    });

    test("archives after asking, and the cycle leaves the screen", async () => {
        vi.mocked(archiveStudyCycle).mockResolvedValue({ success: undefined });
        const store = makeStore();
        renderWithProviders(<StudyCycles />, { route: "/notebook/cycles?cycle=trt", storeOverride: store });

        await screen.findAllByTestId("cycle-block");
        fireEvent.click(screen.getByTestId("cycle-archive"));
        expect(archiveStudyCycle).not.toHaveBeenCalled();
        // From here on the server no longer lists it.
        vi.mocked(getStudyCycles).mockResolvedValue({ success: [summary("fac", "Faculdade")] });
        fireEvent.click(await screen.findByTestId("cycle-archive-confirm"));

        await waitFor(() => expect(archiveStudyCycle).toHaveBeenCalledWith("trt", expect.any(Function)));
        await waitFor(() => expect(store.getState().studyCycles.list.map((c) => c.id)).toEqual(["fac"]));
        expect(store.getState().studyCycles.byId.trt).toBeUndefined();
        // The screen moves on to the cycle that is left.
        await waitFor(() => expect(screen.getAllByTestId("cycle-block")).toHaveLength(1));
    });

    test("with no cycle, offers to build the first", async () => {
        vi.mocked(getStudyCycles).mockResolvedValue({ success: [] });
        renderWithProviders(<StudyCycles />, { route: "/notebook/cycles", storeOverride: makeStore() });

        expect(await screen.findByTestId("study-cycles-empty")).toBeInTheDocument();
    });
});
