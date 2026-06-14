import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "@beyou/state/rootReducer";
import useUiRefresh from "./useUiRefresh";
import { RefreshUI } from "@beyou/types/refreshUi/refreshUi.type";

const baseState = rootReducer(undefined as any, { type: '@@INIT' } as any);

const buildStore = (level: number, constance: number) =>
    configureStore({
        reducer: rootReducer,
        preloadedState: {
            ...baseState,
            perfil: {
                ...baseState.perfil,
                level,
                constance,
            }
        }
    });

const refreshWithUser = (level: number, currentConstance: number): RefreshUI => ({
    refreshUser: {
        currentConstance,
        alreadyIncreaseConstanceToday: true,
        maxConstance: currentConstance,
        xp: 500, level, actualLevelXp: 400, nextLevelXp: 600
    }
});

test("queues a levelUp celebration when level increases", () => {
    const store = buildStore(1, 3);
    renderHook(() => useUiRefresh(refreshWithUser(2, 3)), {
        wrapper: ({ children }) => <Provider store={store}>{children}</Provider>
    });
    expect(store.getState().celebration.queue).toContainEqual({ kind: "levelUp", level: 2 });
});

test("queues a streakMilestone celebration when constance crosses 7", () => {
    const store = buildStore(1, 6);
    renderHook(() => useUiRefresh(refreshWithUser(1, 7)), {
        wrapper: ({ children }) => <Provider store={store}>{children}</Provider>
    });
    expect(store.getState().celebration.queue).toContainEqual({ kind: "streakMilestone", days: 7 });
});

test("queues nothing when level and constance do not cross thresholds", () => {
    const store = buildStore(2, 8);
    renderHook(() => useUiRefresh(refreshWithUser(2, 9)), {
        wrapper: ({ children }) => <Provider store={store}>{children}</Provider>
    });
    expect(store.getState().celebration.queue).toEqual([]);
});

test("queues no celebration when skipCelebrations is true even if level increases", () => {
    const store = buildStore(1, 3);
    renderHook(() => useUiRefresh(refreshWithUser(2, 3), { skipCelebrations: true }), {
        wrapper: ({ children }) => <Provider store={store}>{children}</Provider>
    });
    expect(store.getState().celebration.queue).toEqual([]);
});
