import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders } from "../../test/test-utils";
import { entry, makeStore, target, today, todayCycle } from "../notebook/cycles/__tests__/fixtures";

vi.mock("@beyou/api/notebook", () => ({ getStudyToday: vi.fn() }));

import { getStudyToday } from "@beyou/api/notebook";
import StudyToday from "./studyToday";

beforeEach(() => {
    vi.clearAllMocks();
});

describe("studyToday widget", () => {
    test("shows the day's blocks, the one on now with its pomodoro, and the next couple", async () => {
        vi.mocked(getStudyToday).mockResolvedValue({
            success: today({
                cycles: [todayCycle({
                    entries: [
                        entry({ blockId: "b6", doneToday: true, state: "DONE" }),
                        entry({ blockId: "b7", mode: "GOAL", goalSource: "NEXT", target: target(), start: "19:00", end: "19:40" }),
                        entry({ blockId: "b8", start: "19:40" }),
                        entry({ blockId: "b9", start: "20:50" }),
                        entry({ blockId: "b10", start: "22:00" }),
                    ],
                })],
            }),
        });
        const store = makeStore();
        renderWithProviders(<StudyToday />, { storeOverride: store });

        expect(await screen.findByTestId("study-today-widget")).toHaveTextContent("StudyTodayWidgetBlocks");
        expect(screen.getAllByRole("listitem")).toHaveLength(2);
        fireEvent.click(screen.getByTestId("study-today-widget-focus"));
        expect(store.getState().focus.timer).toMatchObject({ notebookPageId: "p-controle" });
    });

    test("points at building a cycle when there is none", async () => {
        vi.mocked(getStudyToday).mockResolvedValue({ success: today() });
        renderWithProviders(<StudyToday />, { storeOverride: makeStore() });

        expect(await screen.findByRole("link", { name: "StudyCycleInviteAction" })).toHaveAttribute("href", "/notebook/cycles/new");
    });

    test("a rest day says so", async () => {
        vi.mocked(getStudyToday).mockResolvedValue({ success: today({ restingCycles: [{ cycleId: "trt", name: "Concurso TRT" }] }) });
        renderWithProviders(<StudyToday />, { storeOverride: makeStore() });

        expect(await screen.findByTestId("study-today-widget-resting")).toBeInTheDocument();
    });

    /** The dashboard mounts each widget twice (phone carousel and desktop rail); one read serves both. */
    test("two mounts share one read", async () => {
        vi.mocked(getStudyToday).mockResolvedValue({ success: today() });
        const store = makeStore();
        renderWithProviders(<><StudyToday /><StudyToday /></>, { storeOverride: store });

        expect(await screen.findAllByRole("link", { name: "StudyCycleInviteAction" })).toHaveLength(2);
        expect(getStudyToday).toHaveBeenCalledTimes(1);
    });
});
