import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { pomodoroStarted } from "@beyou/state";
import { renderWithProviders } from "../../../../test/test-utils";
import { entry, makeStore, target, today, todayCycle } from "./fixtures";

vi.mock("@beyou/api/notebook", () => ({
    getStudyToday: vi.fn(),
    getStudyCycles: vi.fn(),
    getStudyCycle: vi.fn(),
    getNotebookHome: vi.fn(),
    getTopicTree: vi.fn(),
    logStudySession: vi.fn(),
}));

import { getStudyToday } from "@beyou/api/notebook";
import StudyTodayCard from "../StudyTodayCard";

beforeEach(() => {
    vi.clearAllMocks();
});

/** Today on a Wednesday evening: one block done, the concept on now, a time block after it. */
const busyDay = () => today({
    cycles: [todayCycle({
        entries: [
            entry({ blockId: "b6", position: 6, topic: { id: "info", title: "Informática", icon: null }, doneToday: true, state: "DONE", credited: 55, plannedMinutes: 55, minutesToday: 0 }),
            entry({
                blockId: "b7", position: 7, mode: "GOAL", goalSource: "NEXT", target: target(), credited: 30, minutesToday: 40,
                start: "19:00", end: "19:40", cardsDue: 12,
            }),
            entry({ blockId: "b9", position: 9, topic: { id: "adm", title: "Dir. Administrativo", icon: null }, note: "Lista de questões FCC", start: "19:40", end: "20:50" }),
            entry({ blockId: "b12", position: 12, mode: "GOAL", goalSource: "NEXT", target: target(), start: "20:50", end: "22:00" }),
        ],
    })],
});

describe("StudyTodayCard", () => {
    test("invites a first cycle once the notebook has a topic to put in one", async () => {
        vi.mocked(getStudyToday).mockResolvedValue({ success: today() });
        renderWithProviders(<StudyTodayCard topics={[]} showInvite />, { storeOverride: makeStore() });

        const invite = await screen.findByTestId("study-cycle-invite");
        expect(within(invite).getByTestId("study-cycle-invite-action")).toHaveAttribute("href", "/notebook/cycles/new");
        expect(screen.queryByTestId("study-today-card")).not.toBeInTheDocument();
    });

    test("stays out of the way of an empty notebook", async () => {
        vi.mocked(getStudyToday).mockResolvedValue({ success: today() });
        const { container } = renderWithProviders(<StudyTodayCard topics={[]} showInvite={false} />, { storeOverride: makeStore() });

        await waitFor(() => expect(getStudyToday).toHaveBeenCalled());
        expect(screen.queryByTestId("study-cycle-invite")).not.toBeInTheDocument();
        expect(container).toBeEmptyDOMElement();
    });

    test("an older server without the endpoint leaves the home as it was", async () => {
        vi.mocked(getStudyToday).mockResolvedValue({ error: { errorKey: "NOT_FOUND" } });
        const { container } = renderWithProviders(<StudyTodayCard topics={[]} showInvite />, { storeOverride: makeStore() });

        await waitFor(() => expect(getStudyToday).toHaveBeenCalled());
        expect(container).toBeEmptyDOMElement();
    });

    test("a rest day is one line", async () => {
        vi.mocked(getStudyToday).mockResolvedValue({ success: today({ restingCycles: [{ cycleId: "fac", name: "Faculdade" }] }) });
        renderWithProviders(<StudyTodayCard topics={[]} showInvite />, { storeOverride: makeStore() });

        expect(await screen.findByTestId("study-today-resting")).toHaveTextContent("StudyTodayResting");
        expect(screen.queryByTestId("study-today-card")).not.toBeInTheDocument();
    });

    test("lays out the slice with clock times and puts Focus 25 on the block the day is on", async () => {
        vi.mocked(getStudyToday).mockResolvedValue({ success: busyDay() });
        const store = makeStore();
        renderWithProviders(<StudyTodayCard topics={[]} showInvite />, { storeOverride: store });

        const card = await screen.findByTestId("study-today-card");
        const rows = within(card).getAllByTestId("study-today-entry");
        expect(rows).toHaveLength(4);
        expect(rows.map((row) => row.dataset.current)).toEqual(["false", "true", "false", "false"]);
        expect(rows[1]).toHaveTextContent("19:00–19:40");
        // Only the block on now gets the timer; a block done today has nothing left to open.
        expect(within(card).getAllByTestId("study-today-focus")).toHaveLength(1);
        expect(within(rows[0]).queryByRole("link")).not.toBeInTheDocument();
        expect(within(rows[1]).getByRole("link")).toHaveAttribute("href", "/notebook/p-controle");

        fireEvent.click(within(rows[1]).getByTestId("study-today-focus"));
        // The pomodoro is filed on the concept's page, which is what credits the block.
        expect(store.getState().focus.timer).toMatchObject({ kind: "pomodoro", notebookPageId: "p-controle" });

        // The concept comes back in the topic's next block of the slice (block 12).
        expect(screen.getByTestId("study-today-footer")).toHaveTextContent("StudyTodayFooterBackAt");
    });

    test("does not start a second pomodoro while one is running", async () => {
        vi.mocked(getStudyToday).mockResolvedValue({ success: busyDay() });
        const store = makeStore();
        act(() => {
            store.dispatch(pomodoroStarted({ groupId: "", kind: "pomodoro", minutes: 25, now: Date.now(), date: "2026-10-14", notebookPageId: "elsewhere" }));
        });
        renderWithProviders(<StudyTodayCard topics={[]} showInvite />, { storeOverride: store });

        expect(await screen.findByTestId("study-today-focus")).toBeDisabled();
    });

    test("says the day is done when nothing is left open", async () => {
        vi.mocked(getStudyToday).mockResolvedValue({
            success: today({ blocksDone: 1, blocksTotal: 1, cycles: [todayCycle({ entries: [entry({ doneToday: true, state: "DONE", credited: 70 })] })] }),
        });
        renderWithProviders(<StudyTodayCard topics={[]} showInvite />, { storeOverride: makeStore() });

        expect(await screen.findByTestId("study-today-footer")).toHaveTextContent("StudyTodayAllDone");
        expect(screen.queryByTestId("study-today-focus")).not.toBeInTheDocument();
    });
});
