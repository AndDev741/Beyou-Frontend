import { renderWithProviders } from "../../../test/test-utils";
import DeleteAccountModal from "../DeleteAccountModal";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import requestAccountDeletionCode from "@beyou/api/user/requestAccountDeletionCode";
import deleteAccount from "@beyou/api/user/deleteAccount";
import { tearDownAndLeave } from "../accountTeardown";

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

// Mocked so the tests can ask whether the browser was cleaned out, which is the whole
// question in the ambiguous-failure case. accountTeardown's own behaviour is covered
// in accountTeardown.test.ts.
vi.mock("../accountTeardown", () => ({
    tearDownAndLeave: vi.fn().mockResolvedValue(undefined),
    clearLocalAccountState: vi.fn(),
}));

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
        vi.mocked(tearDownAndLeave).mockResolvedValue(undefined);
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
    /**
     * The failure that is not about the code at all.
     *
     * A dropped connection, a proxy that gave up after the server had already
     * committed, a tab the phone suspended — all of them arrive as a generic error,
     * and none of them says whether the account is still there. Treating them like a
     * wrong code was the bug: the user is told to check their digits for an account
     * that may not exist, and everything it owned stays in this browser's storage for
     * whoever opens it next.
     */
    it("treats a failure that is not about the code as a deletion that may have happened", async () => {
        vi.mocked(deleteAccount).mockResolvedValueOnce({ error: { errorKey: "UnexpectedError" } });
        renderWithProviders(<DeleteAccountModal isOpen onClose={vi.fn()} />);

        fireEvent.click(screen.getByTestId("delete-account-continue"));
        fireEvent.change(await screen.findByTestId("delete-account-code"), { target: { value: "123456" } });
        fireEvent.click(screen.getByTestId("delete-account-code-continue"));
        fireEvent.click(await screen.findByTestId("delete-account-final"));

        await waitFor(() => expect(tearDownAndLeave).toHaveBeenCalledTimes(1));
        expect(screen.queryByTestId("delete-account-code")).not.toBeInTheDocument();
    });

    /**
     * Request a code, close the dialog to go read your email, come back inside the
     * minute: the second request is refused for the cooldown while a perfectly valid
     * code sits in the inbox. Stopping at step one leaves nowhere to type it.
     */
    it("still opens the code step when a code was already sent moments ago", async () => {
        vi.mocked(requestAccountDeletionCode).mockResolvedValueOnce({
            error: { errorKey: "DELETION_CODE_TOO_MANY_REQUESTS" },
        });
        renderWithProviders(<DeleteAccountModal isOpen onClose={vi.fn()} />);

        fireEvent.click(screen.getByTestId("delete-account-continue"));

        expect(await screen.findByTestId("delete-account-code")).toBeInTheDocument();
    });

    it("stops at step one when the code could not be sent for any other reason", async () => {
        vi.mocked(requestAccountDeletionCode).mockResolvedValueOnce({
            error: { errorKey: "UnexpectedError" },
        });
        renderWithProviders(<DeleteAccountModal isOpen onClose={vi.fn()} />);

        fireEvent.click(screen.getByTestId("delete-account-continue"));

        await waitFor(() => expect(requestAccountDeletionCode).toHaveBeenCalled());
        expect(screen.queryByTestId("delete-account-code")).not.toBeInTheDocument();
        expect(screen.getByText("DeleteAccountStep1Title")).toBeInTheDocument();
    });

    /** Asking for a new code kills the old one, so the digits on screen are dead. */
    it("empties the field when a new code is sent", async () => {
        renderWithProviders(<DeleteAccountModal isOpen onClose={vi.fn()} />);

        fireEvent.click(screen.getByTestId("delete-account-continue"));
        const codeInput = await screen.findByTestId("delete-account-code");
        fireEvent.change(codeInput, { target: { value: "123456" } });

        fireEvent.click(screen.getByText("DeleteAccountResend"));

        await waitFor(() => expect(requestAccountDeletionCode).toHaveBeenCalledTimes(2));
        expect(screen.getByTestId("delete-account-code")).toHaveValue("");
        expect(screen.getByTestId("delete-account-code-continue")).toBeDisabled();
    });
});
