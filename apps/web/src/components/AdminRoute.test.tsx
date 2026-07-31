import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders } from "../test/test-utils";

const mockGetCounts = vi.fn();

vi.mock("@beyou/api/feedback/getFeedbackAdminCounts", () => ({
    default: (...args: unknown[]) => mockGetCounts(...args)
}));

import AdminRoute from "./AdminRoute";

const renderGuardedConsole = () =>
    renderWithProviders(
        <Routes>
            <Route path="/dashboard" element={<p>dashboard-landing</p>} />
            <Route element={<AdminRoute />}>
                <Route path="/admin/feedback" element={<p>admin-console</p>} />
            </Route>
        </Routes>,
        { route: "/admin/feedback" }
    );

beforeEach(() => {
    mockGetCounts.mockReset();
});

describe("AdminRoute", () => {
    test("redirects a non-admin away instead of rendering the console", async () => {
        mockGetCounts.mockResolvedValue({ error: { errorKey: "ACCESS_DENIED" } });

        renderGuardedConsole();

        await waitFor(() => expect(screen.getByText("dashboard-landing")).toBeInTheDocument());
        expect(screen.queryByText("admin-console")).not.toBeInTheDocument();
    });

    test("never renders the console while the server answer is still pending", async () => {
        let release: (value: unknown) => void = () => {};
        mockGetCounts.mockReturnValue(new Promise((resolve) => (release = resolve)));

        renderGuardedConsole();

        expect(screen.queryByText("admin-console")).not.toBeInTheDocument();
        expect(screen.queryByText("dashboard-landing")).not.toBeInTheDocument();

        release({ success: { open: 0, takingCare: 0, closed: 0, total: 0 } });
        await waitFor(() => expect(screen.getByText("admin-console")).toBeInTheDocument());
    });

    test("renders the console once the server confirms the caller is an admin", async () => {
        mockGetCounts.mockResolvedValue({ success: { open: 1, takingCare: 0, closed: 0, total: 1 } });

        renderGuardedConsole();

        await waitFor(() => expect(screen.getByText("admin-console")).toBeInTheDocument());
        expect(screen.queryByText("dashboard-landing")).not.toBeInTheDocument();
    });
});
