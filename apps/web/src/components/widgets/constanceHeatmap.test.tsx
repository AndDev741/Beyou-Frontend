import { screen, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "@beyou/state/rootReducer";
import getCheckHistory from "@beyou/api/checkHistory/getCheckHistory";
import { renderWithProviders } from "../../test/test-utils";
import ConstanceHeatmap from "./constanceHeatmap";

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

/** The grid box is shared by the skeleton and the real days — wait for the real ones. */
const loaded = async () => {
    const grid = await screen.findByTestId("constance-heatmap");
    await waitFor(() => expect(grid).toHaveAttribute("data-loading", "false"));
    return grid;
};

beforeEach(() => {
    vi.setSystemTime(new Date("2026-08-13T15:00:00Z"));
});

afterEach(() => {
    vi.useRealTimers();
});

test("asks for sixteen weeks starting on a Sunday, so each row is one weekday", async () => {
    vi.mocked(getCheckHistory).mockResolvedValue({
        success: { ownerType: "USER", ownerId: "u1", from: "2026-04-26", to: "2026-08-13", days: [] },
    } as never);

    renderWithProviders(<ConstanceHeatmap />, { storeOverride: store() });

    await loaded();
    const query = vi.mocked(getCheckHistory).mock.calls[0][0];
    expect(query.ownerType).toBe("USER");
    expect(query.to).toBe("2026-08-13");
    // 2026-04-26 is a Sunday, sixteen weeks back from the week of the 13th.
    expect(query.from).toBe("2026-04-26");
    expect(new Date(`${query.from}T12:00:00Z`).getUTCDay()).toBe(0);
});

test("pads the first week so a Thursday start does not sit on the Sunday row", async () => {
    vi.mocked(getCheckHistory).mockResolvedValue({
        success: {
            ownerType: "USER",
            ownerId: "u1",
            from: "2026-08-13",
            to: "2026-08-13",
            days: [{ day: "2026-08-13", outcome: "DONE" }],
        },
    } as never);

    renderWithProviders(<ConstanceHeatmap />, { storeOverride: store() });

    const grid = await loaded();
    // Four spacers (Sun-Wed) then the day itself.
    expect(grid.querySelectorAll("i")).toHaveLength(5);
    expect(grid.querySelector('[data-day="2026-08-13"]')).toBeInTheDocument();
});

test("carries a legend, because a square's colour is the only thing encoding the outcome", async () => {
    vi.mocked(getCheckHistory).mockResolvedValue({
        success: { ownerType: "USER", ownerId: "u1", from: "2026-08-09", to: "2026-08-13", days: [] },
    } as never);

    renderWithProviders(<ConstanceHeatmap />, { storeOverride: store() });

    await loaded();
    expect(screen.getByText("OutcomeDone")).toBeInTheDocument();
    expect(screen.getByText("OutcomeSkipped")).toBeInTheDocument();
    expect(screen.getByText("OutcomeMissed")).toBeInTheDocument();
    expect(screen.getByText("OutcomeNoActivity")).toBeInTheDocument();
});

test("drops the legend and says so when the history did not load", async () => {
    vi.mocked(getCheckHistory).mockResolvedValue({ error: "UnexpectedError" } as never);

    renderWithProviders(<ConstanceHeatmap />, { storeOverride: store() });

    await screen.findByText("CheckHistoryUnavailable");
    expect(screen.queryByText("OutcomeDone")).not.toBeInTheDocument();
});
