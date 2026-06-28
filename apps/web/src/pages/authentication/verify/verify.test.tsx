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
});
