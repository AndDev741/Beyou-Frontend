import { renderWithProviders } from "../../../test/test-utils";
import ProfileConfiguration from "../ProfileConfiguration";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import deleteUserPhoto from "@beyou/api/user/deleteUserPhoto";
import getProfile from "@beyou/api/user/getProfile";
import store from "../../../redux/store";
import { photoEnter, nameEnter } from "@beyou/state/user/perfilSlice";

vi.mock("@beyou/api/user/deleteUserPhoto", () => ({ default: vi.fn() }));
vi.mock("@beyou/api/user/getProfile", () => ({ default: vi.fn() }));
vi.mock("@beyou/api/user/editUser", () => ({ default: vi.fn() }));
vi.mock("react-toastify", () => ({
    toast: { success: vi.fn(), error: vi.fn() }
}));

/**
 * Removing a profile photo from the web.
 *
 * The server stores a photo in two places and reads them in priority order — an
 * uploaded file first, the Google avatar URL second — and neither client had a way to
 * remove either. The only removal-shaped call available was an edit with an empty
 * `photo`, which clears the column the server skips while a file exists, so the photo
 * returned on the next profile read. These tests watch for the DELETE actually going
 * out, and for the screen believing the server about what is left rather than itself.
 */
describe("ProfileConfiguration photo removal", () => {
    beforeEach(() => {
        vi.mocked(deleteUserPhoto).mockResolvedValue({ success: true });
        vi.mocked(getProfile).mockResolvedValue({ data: { name: "Alice", photo: null } as never });
        // renderWithProviders takes the app's singleton store and ignores
        // preloadedState, so the fixture is a dispatch.
        store.dispatch(nameEnter("Alice"));
        store.dispatch(photoEnter(""));
    });

    // Raw keys, not English: this suite runs without i18n resources loaded, so `t()`
    // hands back the key. Same convention as the other configuration tests.
    const openPhotoModal = () => {
        fireEvent.click(screen.getByText("ChangePhotoShort"));
    };

    it("removes the photo after a confirming click", async () => {
        store.dispatch(photoEnter("/api/v1/user/photo/abc?v=1"));
        renderWithProviders(<ProfileConfiguration />);

        openPhotoModal();
        fireEvent.click(screen.getByText("RemovePhoto"));

        // Nothing has gone out yet: the first click only asks.
        expect(deleteUserPhoto).not.toHaveBeenCalled();

        fireEvent.click(screen.getByText("RemovePhoto"));

        await waitFor(() => expect(deleteUserPhoto).toHaveBeenCalledTimes(1));
        // Re-read rather than assumed: an account that signed in with Google had two
        // photos stored and only the server knows which of them is left.
        await waitFor(() => expect(getProfile).toHaveBeenCalled());
    });

    it("offers nothing to remove when the account has no photo", () => {
        renderWithProviders(<ProfileConfiguration />);

        openPhotoModal();

        expect(screen.queryByText("RemovePhoto")).toBeNull();
        expect(deleteUserPhoto).not.toHaveBeenCalled();
    });
});
