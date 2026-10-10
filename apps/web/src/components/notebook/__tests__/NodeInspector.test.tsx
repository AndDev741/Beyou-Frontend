import { fireEvent, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import rootReducer from "@beyou/state/rootReducer";
import { pomodoroStarted } from "@beyou/state";
import type { Board, BoardNode } from "@beyou/types/notebook/notebook";
import { renderWithProviders } from "../../../test/test-utils";

vi.mock("@beyou/api/notebook", () => ({ getPage: vi.fn() }));

import { getPage } from "@beyou/api/notebook";
import NodeInspector from "../board/NodeInspector";

const NOW = new Date(2026, 9, 9, 10, 0, 0);
const baseState = rootReducer(undefined as never, { type: "@@INIT" } as never);

const node: BoardNode = {
    id: "node-1", kind: "PAGE", pageId: "page-1", title: "Trees", icon: null, status: "STUDYING",
    progress: null, hasBoard: false, x: 0, y: 0, width: null, height: null, linked: false, homeTopicTitle: null,
};
const board: Board = { pageId: "topic-1", nodes: [node], edges: [] };

const renderInspector = (store = configureStore({ reducer: rootReducer, preloadedState: baseState })) => {
    renderWithProviders(
        <NodeInspector board={board} node={node} onClose={vi.fn()} onDelete={vi.fn()} onRenameSection={vi.fn()} />,
        { storeOverride: store },
    );
    return store;
};

beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    vi.mocked(getPage).mockResolvedValue({} as never);
});

afterEach(() => {
    vi.useRealTimers();
});

describe("Focus 25 in the node inspector", () => {
    test("starts a cycle on the node's page when nothing is running", () => {
        const store = renderInspector();

        fireEvent.click(screen.getByTestId("inspector-focus"));

        expect(store.getState().focus.timer?.notebookPageId).toBe("page-1");
    });

    test("is disabled, and says why, while another cycle runs", () => {
        const store = configureStore({ reducer: rootReducer, preloadedState: baseState });
        store.dispatch(pomodoroStarted({ groupId: "hg1", kind: "pomodoro", minutes: 25, now: NOW.getTime() - 60_000, date: "2026-10-09" }));
        renderInspector(store);

        const button = screen.getByTestId("inspector-focus");
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute("aria-describedby", "inspector-focus-busy");
        expect(screen.getByText("NotebookFocusBusyHint")).toBeInTheDocument();
    });
});
