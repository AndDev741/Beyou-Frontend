import { renderWithProviders } from "../../../test/test-utils";
import DangerZone from "../DangerZone";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import exportUserData from "@beyou/api/user/exportUserData";

vi.mock("@beyou/api/user/exportUserData", () => ({ default: vi.fn() }));

vi.mock("react-toastify", () => ({
    toast: { success: vi.fn(), error: vi.fn() }
}));

/**
 * The two buttons are paired on purpose — take your data with you, then leave — so the
 * download is not an optional nicety here. It is the mitigation for the button beside
 * it, and it fails silently when it fails: no throw, no toast, just no file.
 */
describe("DangerZone", () => {
    let createObjectURL: ReturnType<typeof vi.fn>;
    let revokeObjectURL: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        createObjectURL = vi.fn().mockReturnValue("blob:beyou-export");
        revokeObjectURL = vi.fn();
        URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
        URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;
        vi.mocked(exportUserData).mockResolvedValue({ data: { profile: { name: "Test" } } });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("hands the export to the browser as a file, from inside the document", async () => {
        // A detached anchor and a URL revoked in the same task both happen to work in
        // current Chrome and have never been dependable across browsers. Watching the
        // anchor enter the document is the only way to tell the two apart from a test.
        const appended: HTMLAnchorElement[] = [];
        const realAppend = document.body.appendChild.bind(document.body);
        const appendSpy = vi
            .spyOn(document.body, "appendChild")
            .mockImplementation((node: Node) => {
                if (node instanceof HTMLAnchorElement) appended.push(node);
                return realAppend(node);
            });

        renderWithProviders(<DangerZone />);
        fireEvent.click(screen.getByTestId("export-my-data"));

        await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));

        expect(appended).toHaveLength(1);
        expect(appended[0].download).toMatch(/^beyou-data-\d{4}-\d{2}-\d{2}\.json$/);
        expect(appended[0].href).toContain("blob:beyou-export");
        // Cleaned up after itself, so the page is not left collecting anchors.
        expect(appended[0].isConnected).toBe(false);

        // Revoked, but not in the same breath as the click: revoking immediately is
        // what makes the download vanish silently on the browsers that mind.
        expect(revokeObjectURL).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1000);
        expect(revokeObjectURL).toHaveBeenCalledWith("blob:beyou-export");

        appendSpy.mockRestore();
    });

    it("says so when the export could not be fetched, and writes no file", async () => {
        vi.mocked(exportUserData).mockResolvedValue({ error: { errorKey: "UnexpectedError" } });
        const { toast } = await import("react-toastify");

        renderWithProviders(<DangerZone />);
        fireEvent.click(screen.getByTestId("export-my-data"));

        await waitFor(() => expect(toast.error).toHaveBeenCalled());
        expect(createObjectURL).not.toHaveBeenCalled();
    });

    it("keeps the delete dialog out of the tree until it is asked for", async () => {
        renderWithProviders(<DangerZone />);

        // Mounted only while open: a dialog that stays mounted replays the previous
        // session's step on the first frame of the next opening, and gives an
        // abandoned request somewhere to land.
        expect(screen.queryByText("DeleteAccountStep1Title")).not.toBeInTheDocument();

        fireEvent.click(screen.getByTestId("delete-my-account"));
        expect(await screen.findByText("DeleteAccountStep1Title")).toBeInTheDocument();
    });
});
