import { screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "@beyou/state/rootReducer";
import { renderWithProviders } from "../../test/test-utils";
import DailyProgress from "./dailyProgress";

// The test-utils `preloadedState` is ignored (the store is the app's singleton); to
// seed state you have to pass a store of your own.
const base = rootReducer(undefined as never, { type: "@@INIT" } as never);

test("renders a progress ring with the completion percentage", () => {
    renderWithProviders(<DailyProgress checked={3} total={7} />);
    expect(screen.getByText("43%")).toBeInTheDocument();
});

test("renders 0% when total is zero (no division by zero)", () => {
    renderWithProviders(<DailyProgress checked={0} total={0} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
});

test("shows how many items are done next to the ring", () => {
    const { container } = renderWithProviders(<DailyProgress checked={6} total={13} />);
    expect(container.textContent).toContain("6");
    expect(container.textContent).toContain("13");
    expect(screen.getByText("46%")).toBeInTheDocument();
});

test("shows the XP earned today, not the account total", () => {
    const today = new Date().toISOString().split("T")[0];
    const routine = {
        id: "r1",
        name: "R",
        routineSections: [
            {
                id: "s1",
                name: "S",
                iconId: "",
                startTime: "07:00",
                endTime: "08:00",
                order: 0,
                taskGroup: [
                    {
                        id: "tg1",
                        taskId: "t1",
                        startTime: "07:00",
                        endTime: "08:00",
                        taskGroupChecks: [
                            { id: "c1", checkDate: today, checkTime: "07:10", checked: true, skipped: false, xpGenerated: 15 },
                        ],
                    },
                ],
                habitGroup: [],
            },
        ],
    };

    const storeOverride = configureStore({
        reducer: rootReducer,
        preloadedState: {
            ...base,
            perfil: { ...base.perfil, xp: 1490 },
            todayRoutine: { ...base.todayRoutine, routine } as never,
        },
    });

    const { container } = renderWithProviders(<DailyProgress checked={1} total={2} />, {
        storeOverride,
    });

    expect(container.textContent).toContain("+15 XP");
    expect(container.textContent).not.toContain("1490");
});
