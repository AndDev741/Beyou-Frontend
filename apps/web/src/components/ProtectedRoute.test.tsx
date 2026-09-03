import { lazy, Suspense, type ReactElement } from "react";
import { act, fireEvent, screen } from "@testing-library/react";
import { Link, Route, Routes } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";
import { renderWithProviders } from "../test/test-utils";

// The shell pieces are stand-ins: what is under test is whether they stay on screen, not
// what they draw. The axios module is replaced so the gate sees a signed-in session.
vi.mock("./shell/Sidebar", () => ({ default: () => <nav data-testid="shell-sidebar" /> }));
vi.mock("./dashboard/BottomNav", () => ({ default: () => null }));
vi.mock("./agent/AgentWidget", () => ({ default: () => <div data-testid="shell-agent" /> }));
vi.mock("./focus/RunningTimerHub", () => ({ default: () => null }));
vi.mock("./focus/PomodoroOwner", () => ({ default: () => null }));
vi.mock("../services/axiosConfig", () => ({
    default: { defaults: { headers: { common: { Authorization: "Bearer test" } } } }
}));

import ProtectedRoute from "./ProtectedRoute";

describe("ProtectedRoute", () => {
    /**
     * The rule: a page chunk loading for the first time may blank the PAGE AREA and nothing
     * else. With the only Suspense boundary above this component, React hid the whole shell
     * (`display: none`) while the chunk came down, and a chat panel mid-exit at that moment
     * lost its animation and came back as a ghost over the page. The assertion below is the
     * one that goes red in that arrangement: the app-level fallback takes over and the shell
     * stops being visible.
     */
    test("a page chunk loading for the first time never hides the shell", async () => {
        let release: () => void = () => {};
        const LazyPage = lazy(
            () =>
                new Promise<{ default: () => ReactElement }>((resolve) => {
                    release = () => resolve({ default: () => <p>page-b</p> });
                })
        );

        renderWithProviders(
            <Suspense fallback={<p>app-fallback</p>}>
                <Routes>
                    <Route element={<ProtectedRoute authState="authenticated" />}>
                        <Route path="/a" element={<Link to="/b">go to b</Link>} />
                        <Route path="/b" element={<LazyPage />} />
                    </Route>
                </Routes>
            </Suspense>,
            { route: "/a" }
        );

        expect(screen.getByTestId("shell-agent")).toBeVisible();

        fireEvent.click(screen.getByText("go to b"));

        // The chunk is still pending. The shell is exactly where it was and only the page
        // area is waiting; the boundary in App.tsx never saw the suspension.
        expect(screen.getByTestId("shell-agent")).toBeVisible();
        expect(screen.getByTestId("shell-sidebar")).toBeVisible();
        expect(screen.getByTestId("page-fallback")).toBeInTheDocument();
        expect(screen.queryByText("app-fallback")).not.toBeInTheDocument();

        await act(async () => {
            release();
        });

        expect(await screen.findByText("page-b")).toBeVisible();
        expect(screen.queryByTestId("page-fallback")).not.toBeInTheDocument();
        expect(screen.getByTestId("shell-agent")).toBeVisible();
    });
});
