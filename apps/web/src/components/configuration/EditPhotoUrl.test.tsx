import { renderWithProviders } from "../../test/test-utils";
import ProfileConfiguration from "./ProfileConfiguration";
import { screen, fireEvent } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "../../redux/rootReducer";

const baseState = rootReducer(undefined as any, { type: "@@INIT" } as any);

test("shows invalid photo URL error", async () => {
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
                phrase_author: ""
            }
        }
    });

    renderWithProviders(<ProfileConfiguration />, { storeOverride });

    fireEvent.click(screen.getByText("Change Photo"));

    const urlInput = await screen.findByLabelText("ImageURL");
    fireEvent.change(urlInput, { target: { value: "invalid-url" } });
    fireEvent.blur(urlInput);

    expect(await screen.findByText("ProfilePhotoUrlInvalid")).toBeInTheDocument();
});
