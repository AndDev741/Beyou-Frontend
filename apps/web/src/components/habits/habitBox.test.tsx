import { screen, waitFor, fireEvent } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "@beyou/state/rootReducer";
import getCheckHistory from "@beyou/api/checkHistory/getCheckHistory";
import type { habit } from "@beyou/types/habit/habitType";
import { renderWithProviders } from "../../test/test-utils";
import HabitBox from "./habitBox";

vi.mock("@beyou/api/checkHistory/getCheckHistory", () => ({
    __esModule: true,
    default: vi.fn(),
}));

const baseState = rootReducer(undefined as never, { type: "@@INIT" } as never);

const store = () =>
    configureStore({
        reducer: rootReducer,
        preloadedState: { ...baseState, perfil: { ...baseState.perfil, timezone: "UTC" } } as never,
    });

const habitFixture = {
    id: "h1",
    name: "Morning Hydration Boost",
    description: "a glass of water on waking",
    motivationalPhrase: "water first",
    iconId: "lucide:glass-water",
    categories: [],
    routines: {},
    importance: 3,
    dificulty: 2,
    xp: 153,
    level: 1,
    nextLevelXp: 200,
    actualLevelXp: 0,
    currentStreak: 5,
    bestStreak: 9,
    totalCheckIns: 32,
    firstCheckInDate: "2026-06-12",
    streakDormant: false,
    createdAt: new Date(0),
    updatedAt: new Date(0),
} as habit;

const renderCard = (overrides: Partial<habit> = {}) =>
    renderWithProviders(
        <HabitBox {...habitFixture} {...overrides} setHabits={vi.fn()} />,
        { storeOverride: store() },
    );

const expand = () => fireEvent.click(screen.getByRole("button", { name: "Expand" }));

beforeEach(() => {
    vi.setSystemTime(new Date("2026-08-13T15:00:00Z"));
    vi.mocked(getCheckHistory).mockResolvedValue({
        success: {
            ownerType: "HABIT",
            ownerId: "h1",
            from: "2026-07-31",
            to: "2026-08-13",
            days: [
                { day: "2026-08-11", outcome: "DONE" },
                { day: "2026-08-12", outcome: "MISSED" },
                { day: "2026-08-13", outcome: "DONE" },
            ],
        },
    } as never);
});

afterEach(() => {
    vi.useRealTimers();
});

test("shows the streak on the closed card, and the record only once expanded", async () => {
    renderCard();

    expect(screen.getByTitle("Constance").textContent).toContain("5");
    expect(screen.queryByText("best: 9")).not.toBeInTheDocument();

    expand();
    await screen.findByTestId("check-strip-h1");
    expect(screen.getByText("5 DaysUnit")).toBeInTheDocument();
    expect(screen.getByText("Best: 9")).toBeInTheDocument();
});

test("reports the lifetime total and the date it started", async () => {
    renderCard();
    expand();

    await screen.findByTestId("check-strip-h1");
    expect(screen.getByText("32")).toBeInTheDocument();
    expect(screen.getByText(/Since Jun 12/)).toBeInTheDocument();
});

test("says so instead of printing an empty date when nothing was ever checked", async () => {
    renderCard({ currentStreak: 0, bestStreak: 0, totalCheckIns: 0, firstCheckInDate: null });
    expand();

    await screen.findByTestId("check-strip-h1");
    expect(screen.getByText("NoCheckInsYet")).toBeInTheDocument();
    // No streak means no flame: a zero next to a dim flame reads as failure.
    expect(screen.queryByTitle("Constance")).not.toBeInTheDocument();
});

test("asks for the fortnight only when the card opens", async () => {
    renderCard();
    expect(getCheckHistory).not.toHaveBeenCalled();

    expand();

    await waitFor(() => expect(getCheckHistory).toHaveBeenCalledTimes(1));
    expect(vi.mocked(getCheckHistory).mock.calls[0][0]).toEqual({
        ownerType: "HABIT",
        ownerId: "h1",
        from: "2026-07-31",
        to: "2026-08-13",
    });
});

test("draws the day that broke the run, not a strip derived from the number", async () => {
    renderCard();
    expand();

    const strip = await screen.findByTestId("check-strip-h1");
    expect(strip.querySelector('[data-outcome="MISSED"]')).toBeInTheDocument();
    expect(strip.querySelectorAll("i")).toHaveLength(3);
});

test("labels a dormant run instead of resetting it, and drops the flame", async () => {
    renderCard({ streakDormant: true });

    // The number survives on the closed card; the flame does not.
    const chip = screen.getByTitle("StreakPausedExplanation");
    expect(chip.textContent).toContain("5");
    expect(chip.className).not.toContain("flame");

    expand();
    await screen.findByTestId("check-strip-h1");
    expect(screen.getByText("StreakPaused")).toBeInTheDocument();
});
