import { renderWithProviders } from "../../../test/test-utils";
import VerifyEmail from "./verify";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import axios from "axios";
import { isMobileDevice } from "../../../components/utils/openInApp";

vi.mock("axios", () => ({ default: { get: vi.fn() } }));
vi.mock("../../../components/utils/openInApp", async (importActual) => {
    const actual = await importActual<typeof import("../../../components/utils/openInApp")>();
    return { ...actual, isMobileDevice: vi.fn() };
});

const axiosGet = vi.mocked(axios.get);
const mockIsMobile = vi.mocked(isMobileDevice);

describe("VerifyEmail (web)", () => {
    beforeEach(() => {
        axiosGet.mockReset();
        mockIsMobile.mockReset();
    });

    it("auto-verifies on desktop and shows success", async () => {
        mockIsMobile.mockReturnValue(false);
        axiosGet.mockResolvedValue({});
        renderWithProviders(<VerifyEmail />, { route: "/auth/verify?token=test" });
        expect(await screen.findByText("VerifyEmailSuccessTitle")).toBeInTheDocument();
        expect(axiosGet).toHaveBeenCalledTimes(1);
    });

    it("defers verification on mobile and offers the app/browser choice", async () => {
        mockIsMobile.mockReturnValue(true);
        axiosGet.mockResolvedValue({});
        renderWithProviders(<VerifyEmail />, { route: "/auth/verify?token=test" });
        expect(await screen.findByTestId("verify-choose")).toBeInTheDocument();
        expect(screen.getByTestId("open-in-app")).toHaveAttribute("href", "beyou://verify?token=test");
        // The single-use token must NOT be consumed before the user chooses.
        expect(axiosGet).not.toHaveBeenCalled();
    });

    it("verifies in the browser when the mobile fallback is tapped", async () => {
        mockIsMobile.mockReturnValue(true);
        axiosGet.mockResolvedValue({});
        renderWithProviders(<VerifyEmail />, { route: "/auth/verify?token=test" });
        fireEvent.click(await screen.findByTestId("verify-in-browser"));
        expect(await screen.findByText("VerifyEmailSuccessTitle")).toBeInTheDocument();
        await waitFor(() => expect(axiosGet).toHaveBeenCalledTimes(1));
    });

    it("shows the error state when no token is present", async () => {
        mockIsMobile.mockReturnValue(false);
        renderWithProviders(<VerifyEmail />, { route: "/auth/verify" });
        expect(await screen.findByText("VerifyEmailErrorTitle")).toBeInTheDocument();
        expect(axiosGet).not.toHaveBeenCalled();
    });

    /**
     * The page is nothing but its state, and it used to say two things at once.
     * AuthShell renders the page's single h1 from `title`, and this page passed the
     * fixed "check your e-mail" while each state rendered a second h1 of its own — so
     * desktop showed "Confira seu e-mail" sitting above "Email verificado!", two
     * headings contradicting each other over one green tick.
     */
    it("shows one heading, and it is the one that matches the state", async () => {
        axiosGet.mockResolvedValue({});
        renderWithProviders(<VerifyEmail />, { route: "/auth/verify?token=test" });

        await screen.findByText("VerifyEmailSuccessTitle");
        const headings = screen.getAllByRole("heading", { level: 1 });
        expect(headings).toHaveLength(1);
        expect(headings[0]).toHaveTextContent("VerifyEmailSuccessTitle");
        expect(screen.queryByText("VerifyEmailTitle")).not.toBeInTheDocument();
    });

    /**
     * Worse than untidy on a phone. This screen is shown BEFORE anything is verified —
     * the token is single-use and the deep link needs it alive — and it announced
     * "Email verified!" over a button offering to verify.
     */
    it("does not claim the email is verified before it has been", async () => {
        mockIsMobile.mockReturnValue(true);
        renderWithProviders(<VerifyEmail />, { route: "/auth/verify?token=test" });

        await screen.findByTestId("verify-choose");
        const headings = screen.getAllByRole("heading", { level: 1 });
        expect(headings).toHaveLength(1);
        expect(headings[0]).toHaveTextContent("VerifyEmailChooseTitle");
        expect(screen.queryByText("VerifyEmailSuccessTitle")).not.toBeInTheDocument();
        expect(axiosGet).not.toHaveBeenCalled();
    });

    it("names the failure in the heading too", async () => {
        renderWithProviders(<VerifyEmail />, { route: "/auth/verify" });

        await screen.findByText("VerifyEmailErrorTitle");
        const headings = screen.getAllByRole("heading", { level: 1 });
        expect(headings).toHaveLength(1);
        expect(headings[0]).toHaveTextContent("VerifyEmailErrorTitle");
    });
});
