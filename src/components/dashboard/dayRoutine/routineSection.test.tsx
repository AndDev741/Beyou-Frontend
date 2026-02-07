import { screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { vi } from "vitest";
import rootReducer from "../../../redux/rootReducer";
import { renderWithProviders } from "../../../test/test-utils";
import RoutineSection from "./routineSection";

vi.mock("../../../services/routine/checkItem", () => ({
    default: vi.fn()
}));

vi.mock("../../../services/routine/skipItem", () => ({
    default: vi.fn()
}));

const buildStore = () =>
    configureStore({
        reducer: rootReducer,
        preloadedState: {
            tasks: {
                tasks: [
                    {
                        id: "t1",
                        name: "Task 1",
                        iconId: "",
                        oneTimeTask: false,
                        markedToDelete: new Date(),
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                ]
            },
            habits: {
                habits: []
            }
        }
    });

describe("RoutineSection skip UI", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2024-01-01T10:00:00Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test("shows undo skip and skipped label when item is skipped", () => {
        const section = {
            id: "s1",
            name: "Morning",
            iconId: "",
            startTime: "07:00",
            endTime: "10:00",
            taskGroup: [
                {
                    id: "tg1",
                    taskId: "t1",
                    startTime: "08:00",
                    endTime: "09:00",
                    taskGroupChecks: [
                        {
                            id: "c1",
                            checkDate: "2024-01-01",
                            checkTime: "08:00",
                            checked: false,
                            skipped: true,
                            xpGenerated: 0
                        }
                    ]
                }
            ],
            habitGroup: [],
            order: 0
        };

        const store = buildStore();
        renderWithProviders(<RoutineSection section={section} routineId="r1" />, { storeOverride: store });

        expect(screen.getByText("Undo skip")).toBeInTheDocument();
        expect(screen.getByText("Skipped")).toBeInTheDocument();
    });

    test("does not show skip action when item is checked", () => {
        const section = {
            id: "s1",
            name: "Morning",
            iconId: "",
            startTime: "07:00",
            endTime: "10:00",
            taskGroup: [
                {
                    id: "tg1",
                    taskId: "t1",
                    startTime: "08:00",
                    endTime: "09:00",
                    taskGroupChecks: [
                        {
                            id: "c1",
                            checkDate: "2024-01-01",
                            checkTime: "08:00",
                            checked: true,
                            skipped: false,
                            xpGenerated: 10
                        }
                    ]
                }
            ],
            habitGroup: [],
            order: 0
        };

        const store = buildStore();
        renderWithProviders(<RoutineSection section={section} routineId="r1" />, { storeOverride: store });

        expect(screen.queryByText("Skip")).toBeNull();
        expect(screen.queryByText("Undo skip")).toBeNull();
    });
});
