import { renderWithProviders } from "../../test/test-utils";
import ProfileConfiguration from "./ProfileConfiguration";
import { screen, fireEvent } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "@beyou/state/rootReducer";

const baseState = rootReducer(undefined as any, { type: "@@INIT" } as any);

function renderProfile() {
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
}

/** Opens the photo modal through the "Change photo" button next to the avatar. */
function openPhotoModal() {
    fireEvent.click(screen.getByRole("button", { name: /ChangePhotoShort/i }));
}

test("opens photo modal when clicking the photo area", () => {
    renderProfile();
    openPhotoModal();
    expect(screen.getByText("ChooseFile")).toBeInTheDocument();
});

test("shows Save and Cancel buttons in photo modal", () => {
    renderProfile();
    openPhotoModal();

    // The form's button is now "SaveProfile"; the bare "Save" is the modal's.
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
});

test("Save button in modal is disabled when no file is selected", () => {
    renderProfile();
    openPhotoModal();

    // Only one bare "Save" exists now: the modal's (the form's became
    // "SaveProfile").
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
});

test("shows error for invalid file type", () => {
    renderProfile();
    openPhotoModal();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    const invalidFile = new File(["not-an-image"], "test.txt", { type: "text/plain" });
    fireEvent.change(fileInput!, { target: { files: [invalidFile] } });

    expect(screen.getByText("PHOTO_UPLOAD_INVALID_TYPE")).toBeInTheDocument();
});

test("closes modal when Cancel is clicked", () => {
    renderProfile();
    openPhotoModal();

    expect(screen.getByText("ChooseFile")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.queryByText("ChooseFile")).not.toBeInTheDocument();
});
