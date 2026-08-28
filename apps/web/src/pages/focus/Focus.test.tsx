import { screen, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import rootReducer from "@beyou/state/rootReducer";
import { renderWithProviders } from "../../test/test-utils";

vi.mock("@beyou/api/routine/getTodayRoutine", () => ({ __esModule: true, default: vi.fn() }));
vi.mock("@beyou/api/habits/getHabits", () => ({ __esModule: true, default: vi.fn() }));
vi.mock("@beyou/api/tasks/getTasks", () => ({ __esModule: true, default: vi.fn() }));
vi.mock("../../components/useAuthGuard", () => ({ __esModule: true, default: () => {} }));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
    return { ...actual, useNavigate: () => mockNavigate };
});

import getTodayRoutine from "@beyou/api/routine/getTodayRoutine";
import getHabits from "@beyou/api/habits/getHabits";
import getTasks from "@beyou/api/tasks/getTasks";
import Focus from "./Focus";
import RoutineDay from "../../components/dashboard/dayRoutine/dayRoutine";

const baseState = rootReducer(undefined as never, { type: "@@INIT" } as never);

const routineWithOneHabit = {
    id: "r-1",
    name: "Morning",
    iconId: "icon",
    routineSections: [
        {
            id: "s-1",
            name: "Wake up",
            iconId: "icon",
            startTime: "07:00",
            endTime: "09:00",
            order: 0,
            habitGroup: [
                {
                    id: "hg-1",
                    habitId: "h-1",
                    startTime: "07:30",
                    endTime: "08:00",
                    habitGroupChecks: [],
                },
            ],
            taskGroup: [],
        },
    ],
};

const buildStore = (overrides: Record<string, unknown> = {}) =>
    configureStore({
        reducer: rootReducer,
        preloadedState: { ...baseState, ...overrides },
    });

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTodayRoutine).mockResolvedValue({ success: routineWithOneHabit as never });
    vi.mocked(getHabits).mockResolvedValue({
        success: [{ id: "h-1", name: "Drink water", iconId: "icon" }] as never,
    });
    vi.mocked(getTasks).mockResolvedValue({ success: [] as never });
});

describe("Focus screen", () => {
    test("fetches habits and tasks too, not only the routine", async () => {
        // The routine carries item groups; the names live in the other two slices, and
        // routineSection renders nothing for a group it cannot resolve. Arriving straight
        // here (reload, bookmark) with only the routine drew an empty routine.
        renderWithProviders(<Focus />, { storeOverride: buildStore() });

        await waitFor(() => expect(getTodayRoutine).toHaveBeenCalled());
        expect(getHabits).toHaveBeenCalled();
        expect(getTasks).toHaveBeenCalled();
    });

    test("fills the day's progress, which the perfil slice cannot restore on a reload", async () => {
        const store = buildStore();
        renderWithProviders(<Focus />, { storeOverride: store });

        await waitFor(() => {
            expect(store.getState().perfil.totalItemsInScheduledRoutine).toBe(1);
        });
        expect(store.getState().perfil.checkedItemsInScheduledRoutine).toBe(0);
    });

    test("marks focus as entered so the routine card hides its own way in", async () => {
        const store = buildStore();
        renderWithProviders(<Focus />, { storeOverride: store });

        await waitFor(() => expect(store.getState().focus.mode).toBe("fullscreen"));
    });

    test("leaves on Escape", async () => {
        renderWithProviders(<Focus />, { storeOverride: buildStore() });
        await waitFor(() => expect(screen.getByTestId("focus-screen")).toBeInTheDocument());

        await userEvent.keyboard("{Escape}");

        expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    test("a failed HABITS fetch is surfaced too, since the rows come from it", async () => {
        // The routine arrives fine and the sections draw, but every row inside them is
        // dropped for an unresolvable habit. Silent, that reads as a bug in the app.
        vi.mocked(getHabits).mockResolvedValue({ error: "Habits are down" });

        renderWithProviders(<Focus />, { storeOverride: buildStore() });

        await waitFor(() =>
            expect(screen.getByTestId("focus-error")).toHaveTextContent("Habits are down")
        );
    });

    test("Escape leaves the modal alone when one is open", async () => {
        renderWithProviders(<Focus />, { storeOverride: buildStore() });
        await waitFor(() => expect(screen.getByTestId("focus-screen")).toBeInTheDocument());

        // Both the shared Modal and this screen listen on the window, so without the guard
        // one keypress closes the dialog and exits focus at the same time.
        const dialog = document.createElement("div");
        dialog.setAttribute("role", "dialog");
        document.body.appendChild(dialog);
        try {
            await userEvent.keyboard("{Escape}");
            expect(mockNavigate).not.toHaveBeenCalled();
        } finally {
            dialog.remove();
        }

        await userEvent.keyboard("{Escape}");
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    test("a failed routine fetch says so instead of claiming nothing is scheduled", async () => {
        vi.mocked(getTodayRoutine).mockResolvedValue({ error: "Network is down" });

        renderWithProviders(<Focus />, { storeOverride: buildStore() });

        await waitFor(() => expect(screen.getByTestId("focus-error")).toHaveTextContent("Network is down"));
        expect(screen.queryByTestId("no-routine-today")).not.toBeInTheDocument();
    });
});

describe("focus entry button on the routine card", () => {
    test("offered while focus is off", () => {
        renderWithProviders(<RoutineDay routine={routineWithOneHabit as never} />, {
            storeOverride: buildStore(),
        });

        expect(screen.getByTestId("focus-enter")).toHaveAttribute("href", "/focus");
    });

    test("hidden once focus is on, since the focus screen renders this same card", () => {
        renderWithProviders(<RoutineDay routine={routineWithOneHabit as never} />, {
            storeOverride: buildStore({ focus: { mode: "fullscreen" } }),
        });

        expect(screen.queryByTestId("focus-enter")).not.toBeInTheDocument();
    });

    test("not offered when there is no routine today", () => {
        renderWithProviders(<RoutineDay routine={null} />, { storeOverride: buildStore() });

        expect(screen.queryByTestId("focus-enter")).not.toBeInTheDocument();
        expect(screen.getByTestId("no-routine-today")).toBeInTheDocument();
    });
});
