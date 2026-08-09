import { screen, act, waitFor, fireEvent, within } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { vi, beforeEach } from "vitest";
import { renderWithProviders } from "../../test/test-utils";
import rootReducer, { RootState } from "@beyou/state/rootReducer";
import getCategories from "@beyou/api/categories/getCategories";

vi.mock("../../services/verifyAuthentication", () => ({
    default: vi.fn(() => Promise.resolve("success"))
}));

vi.mock("@beyou/api/categories/getCategories", () => ({
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

/**
 * The form no longer sits in a column next to the grid: the page shows the
 * grid full width and creating/editing happens in a modal. These tests replace
 * the old "the create form is always on screen" assertions.
 */
test("shows the create button and no inline form", async () => {
    const { default: Categories } = await import("./categories");
    const store = buildStore(false);
    renderWithProviders(<Categories />, { storeOverride: store });

    expect(screen.getByTestId("create-category")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("opens the Create Category form in a modal", async () => {
    const { default: Categories } = await import("./categories");
    const store = buildStore(false);
    renderWithProviders(<Categories />, { storeOverride: store });

    await act(async () => {
        fireEvent.click(screen.getByTestId("create-category"));
    });

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-labelledby", "category-create-title");
    expect(within(dialog).getByRole("heading", { name: "CreateCategory" })).toBeInTheDocument();
});

test("stale editMode is reset on mount, so no modal opens", async () => {
    const { default: Categories } = await import("./categories");
    const store = buildStore(true);
    renderWithProviders(<Categories />, { storeOverride: store });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("create-category")).toBeInTheDocument();
});

test("keeps the tutorial anchors the spotlight measures", async () => {
    const { default: Categories } = await import("./categories");
    const store = buildStore(false);
    renderWithProviders(<Categories />, { storeOverride: store });

    // The grid is measured by the categories spotlight and must stay mounted
    // even while empty; the create step now anchors on the button that opens
    // the modal, since the form is no longer always on screen.
    expect(document.querySelector("[data-tutorial-id='categories-grid']")).toBeInTheDocument();
    expect(document.querySelector("[data-tutorial-id='category-create-form']")).toBeInTheDocument();
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
