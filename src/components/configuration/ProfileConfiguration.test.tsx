import { renderWithProviders } from "../../test/test-utils";
import ProfileConfiguration from "./ProfileConfiguration";
import { screen, fireEvent } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "../../redux/rootReducer";

const baseState = rootReducer(undefined as any, { type: '@@INIT' } as any);

test('shows validation errors and disables save for invalid name', async () => {
    const storeOverride = configureStore({
        reducer: rootReducer,
        preloadedState: {
            ...baseState,
            perfil: {
                ...baseState.perfil,
                username: "Test User",
                email: "test@example.com",
                photo: "https://example.com/photo.png",
                phrase: "",
                phrase_author: "",
            }
        }
    });

    renderWithProviders(<ProfileConfiguration />, {
        storeOverride
    });

    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: "a" } });

    const saveButtons = screen.getAllByRole("button", { name: /Save/i });
    const saveButton = saveButtons[0];
    fireEvent.click(saveButton);

    expect(await screen.findByText("YupMinimumName")).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
});
