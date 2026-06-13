import { screen, act, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { vi, beforeEach } from "vitest";
import { renderWithProviders } from "../../test/test-utils";
import rootReducer, { RootState } from "../../redux/rootReducer";
import getCategories from "../../services/categories/getCategories";

vi.mock("../../services/verifyAuthentication", () => ({
    default: vi.fn(() => Promise.resolve("success"))
}));

vi.mock("../../services/categories/getCategories", () => ({
    default: vi.fn()
}));

beforeEach(() => {
    vi.mocked(getCategories).mockResolvedValue({ success: [] });
});

const buildStore = (editMode: boolean) => {
    const initial = rootReducer(undefined, { type: "init" }) as RootState;
    const preloadedState: RootState = {
        ...initial,
        editCategory: { ...initial.editCategory, editMode }
    };
    return configureStore({ reducer: rootReducer, preloadedState });
};

test("shows Create Category form when editMode is false", async () => {
    const { default: Categories } = await import("./categories");
    const store = buildStore(false);
    renderWithProviders(<Categories />, { storeOverride: store });

    expect(screen.getByText("CreateCategory")).toBeInTheDocument();
});

test("shows Create Category form even if editMode is true (reset on mount)", async () => {
    const { default: Categories } = await import("./categories");
    const store = buildStore(true);
    renderWithProviders(<Categories />, { storeOverride: store });

    expect(screen.getByText("CreateCategory")).toBeInTheDocument();
});

test("dispatches error to store when getCategories returns an error", async () => {
    vi.mocked(getCategories).mockResolvedValue({ error: "Some backend error" });

    const { default: Categories } = await import("./categories");
    const store = buildStore(false);

    await act(async () => {
        renderWithProviders(<Categories />, { storeOverride: store });
        await new Promise((r) => setTimeout(r, 50));
    });

    await waitFor(() => {
        expect(store.getState().errorHandler.defaultError).toBe("Some backend error");
    });
});
