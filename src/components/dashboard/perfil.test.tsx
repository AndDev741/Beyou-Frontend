import { renderWithProviders } from "../../test/test-utils"
import Perfil from "./perfil"
import { screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "../../redux/rootReducer";

const baseState = rootReducer(undefined as any, { type: '@@INIT' } as any);

test('Should show all relevant user data in the dashboard', () => {
    const storeOverride = configureStore({
        reducer: rootReducer,
        preloadedState: {
            ...baseState,
            perfil: {
                ...baseState.perfil,
                username: "AndDev741",
                photo: "https://avatars.githubusercontent.com/u/133960519?v=4",
                phrase: "Let's go",
                phrase_author: "me",
                constance: 15,
            }
        }
    });

    renderWithProviders(<Perfil />, {
        storeOverride
    });

    expect(screen.getByText(/AndDev741/i)).toBeInTheDocument();
    expect(screen.getByRole('img', {name: /PerfilPhotoAlt/i})).toBeInTheDocument();
    expect(screen.getByText(/Let's go/i)).toBeInTheDocument();
    expect(screen.getByText(/me/i)).toBeInTheDocument();
    expect(screen.getAllByText(/15/).length).toBeGreaterThan(0);
});

test('Should render the profile without the phrase and author', () => {
    const storeOverride = configureStore({
        reducer: rootReducer,
        preloadedState: {
            ...baseState,
            perfil: {
                ...baseState.perfil,
                username: "AndDev741",
                photo: "https://avatars.githubusercontent.com/u/133960519?v=4",
                phrase: "",
                phrase_author: "",
                constance: 15,
            }
        }
    });

    renderWithProviders(<Perfil />, {
        storeOverride
    });

    const phraseElement = screen.queryByText(/"/i);
    expect(phraseElement).not.toBeInTheDocument();
})
