import { screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { vi } from "vitest";
import { renderWithProviders } from "../../test/test-utils";
import rootReducer, { RootState } from "../../redux/rootReducer";

vi.mock("../../services/verifyAuthentication", () => ({
    default: vi.fn(() => Promise.resolve("success"))
}));

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
