import { renderWithProviders } from "../../../test/test-utils";
import DeleteAccountModal from "../DeleteAccountModal";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import requestAccountDeletionCode from "@beyou/api/user/requestAccountDeletionCode";
import deleteAccount from "@beyou/api/user/deleteAccount";

vi.mock("@beyou/api/user/requestAccountDeletionCode", () => ({
    default: vi.fn().mockResolvedValue({ success: true })
}));

vi.mock("@beyou/api/user/deleteAccount", () => ({
    default: vi.fn().mockResolvedValue({ success: true })
}));

vi.mock("react-toastify", () => ({
    toast: { success: vi.fn(), error: vi.fn() }
}));

// The last step navigates away and purges redux-persist; neither belongs in a unit test.
vi.mock("../../../redux/store", async () => {
    const actual = await vi.importActual<typeof import("../../../redux/store")>("../../../redux/store");
    return { ...actual, persistor: { purge: vi.fn().mockResolvedValue(undefined) } };
});

/**
 * Deleting an account is three deliberate steps on purpose: say it out loud, prove
 * the inbox is yours, and then say goodbye. Nothing may reach the delete call
 * before all three.
 */
describe("DeleteAccountModal", () => {
    // `mockReset: true` in vite.config wipes implementations between tests, so the
    // happy path is re-armed here rather than in the factories above.
    beforeEach(() => {
        vi.mocked(requestAccountDeletionCode).mockResolvedValue({ success: true });
        vi.mocked(deleteAccount).mockResolvedValue({ success: true });
    });

    it("asks for a code only after the first confirmation", async () => {
        renderWithProviders(<DeleteAccountModal isOpen onClose={vi.fn()} />);

        expect(requestAccountDeletionCode).not.toHaveBeenCalled();
        expect(screen.getByText("DeleteAccountStep1Title")).toBeInTheDocument();

        fireEvent.click(screen.getByTestId("delete-account-continue"));

        await waitFor(() => expect(requestAccountDeletionCode).toHaveBeenCalledTimes(1));
        expect(await screen.findByTestId("delete-account-code")).toBeInTheDocument();
    });

    it("holds the delete until the goodbye step, then spends the code", async () => {
        renderWithProviders(<DeleteAccountModal isOpen onClose={vi.fn()} />);

        fireEvent.click(screen.getByTestId("delete-account-continue"));
        const codeInput = await screen.findByTestId("delete-account-code");

        fireEvent.change(codeInput, { target: { value: "123456" } });
        fireEvent.click(screen.getByTestId("delete-account-code-continue"));

        // The goodbye screen comes first, and nothing has been deleted yet.
        expect(await screen.findByText("DeleteAccountStep3Title")).toBeInTheDocument();
        expect(deleteAccount).not.toHaveBeenCalled();

        fireEvent.click(screen.getByTestId("delete-account-final"));
        await waitFor(() => expect(deleteAccount).toHaveBeenCalledWith("123456"));
    });

    it("keeps a half-typed code out of the delete call", async () => {
        renderWithProviders(<DeleteAccountModal isOpen onClose={vi.fn()} />);

        fireEvent.click(screen.getByTestId("delete-account-continue"));
        const codeInput = await screen.findByTestId("delete-account-code");

        fireEvent.change(codeInput, { target: { value: "12" } });

        expect(screen.getByTestId("delete-account-code-continue")).toBeDisabled();
    });

    it("sends a wrong code back to the code step instead of leaving the user stuck", async () => {
        vi.mocked(deleteAccount).mockResolvedValueOnce({ error: { errorKey: "DELETION_CODE_INVALID" } });
        renderWithProviders(<DeleteAccountModal isOpen onClose={vi.fn()} />);

        fireEvent.click(screen.getByTestId("delete-account-continue"));
        const codeInput = await screen.findByTestId("delete-account-code");
        fireEvent.change(codeInput, { target: { value: "000000" } });
        fireEvent.click(screen.getByTestId("delete-account-code-continue"));
        fireEvent.click(await screen.findByTestId("delete-account-final"));

        expect(await screen.findByTestId("delete-account-code")).toBeInTheDocument();
    });
});
