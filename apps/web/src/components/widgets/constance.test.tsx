import { screen, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "@beyou/state/rootReducer";
import getCheckHistory from "@beyou/api/checkHistory/getCheckHistory";
import { renderWithProviders } from "../../test/test-utils";
import Constance from "./constance";

vi.mock("@beyou/api/checkHistory/getCheckHistory", () => ({
    __esModule: true,
    default: vi.fn(),
}));

const baseState = rootReducer(undefined as never, { type: "@@INIT" } as never);

const storeWith = (perfil: Record<string, unknown>) =>
    configureStore({
        reducer: rootReducer,
        preloadedState: { ...baseState, perfil: { ...baseState.perfil, ...perfil } } as never,
    });

/** A history whose LAST day is `2026-08-13`, so that is "today" for these cases. */
const history = (outcomes: string[]) => ({
    success: {
        ownerType: "USER",
        ownerId: "u1",
        from: "2026-08-01",
        to: "2026-08-13",
        days: outcomes.map((outcome, index) => ({
            day: `2026-08-${String(index + 1).padStart(2, "0")}`,
            outcome,
        })),
    },
});

beforeEach(() => {
    vi.mocked(getCheckHistory).mockResolvedValue(history(["DONE", "SKIPPED", "MISSED", "NOT_SCHEDULED"]) as never);
});

test("asks for the account's history with no range, so the server picks its own 28 days", async () => {
    renderWithProviders(<Constance constance={12} />, { storeOverride: storeWith({ maxConstance: 21 }) });

    await screen.findByTestId("streak-strip");
    expect(vi.mocked(getCheckHistory).mock.calls[0][0]).toEqual({
        ownerType: "USER",
        ownerId: undefined,
        from: undefined,
        to: undefined,
    });
});

test("draws one square per day the server returned, with its outcome on it", async () => {
    renderWithProviders(<Constance constance={12} />, { storeOverride: storeWith({ maxConstance: 21 }) });

    const strip = await screen.findByTestId("streak-strip");
    const cells = strip.querySelectorAll("i");
    expect(cells).toHaveLength(4);
    // The strip is the days, not a derivation of the streak number: a missed day
    // shows up even though the current streak is 12.
    expect(strip.querySelector('[data-outcome="MISSED"]')).toBeInTheDocument();
    expect(strip.querySelector('[data-outcome="SKIPPED"]')).toBeInTheDocument();
});

test("shows the streak and the record", async () => {
    renderWithProviders(<Constance constance={12} />, { storeOverride: storeWith({ maxConstance: 21 }) });

    await screen.findByTestId("streak-strip");
    expect(screen.getByTestId("constance-value").textContent).toBe("12");
    expect(screen.getByText(/21/)).toBeInTheDocument();
});

test("labels a dormant run and dims the number instead of resetting it", async () => {
    renderWithProviders(<Constance constance={12} />, {
        storeOverride: storeWith({ maxConstance: 21, constanceDormant: true }),
    });

    await screen.findByTestId("streak-strip");
    expect(screen.getByTestId("constance-dormant")).toBeInTheDocument();
    // The number survives: the run is paused, not broken.
    expect(screen.getByTestId("constance-value").textContent).toBe("12");
    expect(screen.getByTestId("constance-value").className).toContain("text-text-3");
});

test("says the history is unavailable rather than drawing an empty month as failure", async () => {
    vi.mocked(getCheckHistory).mockResolvedValue({ error: "UnexpectedError" } as never);

    renderWithProviders(<Constance constance={12} />, { storeOverride: storeWith({}) });

    await waitFor(() => expect(screen.getByText("CheckHistoryUnavailable")).toBeInTheDocument());
    expect(screen.queryByText("StreakStripCaption")).not.toBeInTheDocument();
});

test("marks today's undecided square as open, not as a day with no record", async () => {
    // The outcome of a day is only settled when it closes, so today reads UNKNOWN
    // until it is checked.
    vi.mocked(getCheckHistory).mockResolvedValue({
        success: {
            ownerType: "USER",
            ownerId: "u1",
            from: "2026-08-12",
            to: "2026-08-13",
            days: [
                { day: "2026-08-12", outcome: "DONE" },
                { day: "2026-08-13", outcome: "UNKNOWN" },
            ],
        },
    } as never);

    // The zone decides which day is today, and it comes from the profile.
    vi.setSystemTime(new Date("2026-08-13T15:00:00Z"));
    renderWithProviders(<Constance constance={1} />, { storeOverride: storeWith({ timezone: "UTC" }) });

    const strip = await screen.findByTestId("streak-strip");
    const today = strip.querySelector('[data-day="2026-08-13"]');
    expect(today?.className).toContain("ring-accent");
    vi.useRealTimers();
});
