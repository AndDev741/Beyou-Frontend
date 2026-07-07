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

/** Open the photo edit modal by clicking the profile image. */
function openPhotoModal() {
    const photoImg = screen.getByAltText("Profile");
    const photoDiv = photoImg.closest("div")!;
    fireEvent.click(photoDiv);
}

test("opens photo modal when clicking the photo area", () => {
    renderProfile();
    openPhotoModal();
    expect(screen.getByText("ChooseFile")).toBeInTheDocument();
});

test("shows Save and Cancel buttons in photo modal", () => {
    renderProfile();
    openPhotoModal();

    // Two Save buttons exist: form + modal. getAllByText shows there are 2.
    const saveButtons = screen.getAllByText("Save");
    expect(saveButtons).toHaveLength(2);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
});

test("Save button in modal is disabled when no file is selected", () => {
    renderProfile();
    openPhotoModal();

    // The modal Save button is the second one in the document
    const saveButtons = screen.getAllByText("Save");
    const modalSaveButton = saveButtons[1]; // second Save button (modal)
    expect(modalSaveButton).toBeDisabled();
});

test("shows error for invalid file type", () => {
    renderProfile();
    openPhotoModal();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    const invalidFile = new File(["not-an-image"], "test.txt", { type: "text/plain" });
    fireEvent.change(fileInput!, { target: { files: [invalidFile] } });

    expect(screen.getByText("PhotoUploadInvalidType")).toBeInTheDocument();
});

test("closes modal when Cancel is clicked", () => {
    renderProfile();
    openPhotoModal();

    expect(screen.getByText("ChooseFile")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.queryByText("ChooseFile")).not.toBeInTheDocument();
});
