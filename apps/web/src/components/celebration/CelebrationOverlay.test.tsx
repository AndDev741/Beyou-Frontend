import { act, fireEvent, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { vi } from "vitest";
import rootReducer from "@beyou/state/rootReducer";
import { renderWithProviders } from "../../test/test-utils";
import CelebrationOverlay from "./CelebrationOverlay";

const buildStore = (queue: any[]) =>
    configureStore({ reducer: rootReducer, preloadedState: { celebration: { queue } } as any });

test("renders level-up celebration and auto-dismisses after 4s", async () => {
    vi.useFakeTimers();
    const store = buildStore([{ kind: "levelUp", level: 3 }]);
    renderWithProviders(<CelebrationOverlay />, { storeOverride: store });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("LevelUpTitle")).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(4100); });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    vi.useRealTimers();
});

test("renders streak milestone celebration", () => {
    const store = buildStore([{ kind: "streakMilestone", days: 7 }]);
    renderWithProviders(<CelebrationOverlay />, { storeOverride: store });
    expect(screen.getByText("StreakMilestoneTitle")).toBeInTheDocument();
});

test("renders nothing when the queue is empty", () => {
    const store = buildStore([]);
    renderWithProviders(<CelebrationOverlay />, { storeOverride: store });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("Escape key dismisses the celebration overlay", () => {
    const store = buildStore([{ kind: "levelUp", level: 3 }]);
    renderWithProviders(<CelebrationOverlay />, { storeOverride: store });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
