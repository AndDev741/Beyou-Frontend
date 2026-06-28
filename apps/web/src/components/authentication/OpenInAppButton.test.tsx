import { renderWithProviders } from "../../test/test-utils";
import { screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import OpenInAppButton from "./OpenInAppButton";
import { isMobileDevice } from "../utils/openInApp";

// Keep buildAppLink real; only stub the device check so render is deterministic.
vi.mock("../utils/openInApp", async (importActual) => {
    const actual = await importActual<typeof import("../utils/openInApp")>();
    return { ...actual, isMobileDevice: vi.fn() };
});
const mockIsMobile = vi.mocked(isMobileDevice);

describe("OpenInAppButton", () => {
    beforeEach(() => {
        mockIsMobile.mockReset();
    });

    it("renders nothing on desktop", () => {
        mockIsMobile.mockReturnValue(false);
        const { container } = renderWithProviders(<OpenInAppButton path="reset" token="tok" />);
        expect(container).toBeEmptyDOMElement();
    });

    it("renders nothing when there is no token", () => {
        mockIsMobile.mockReturnValue(true);
        const { container } = renderWithProviders(<OpenInAppButton path="reset" token="" />);
        expect(container).toBeEmptyDOMElement();
    });

    it("renders the deep-link button on mobile with a token", () => {
        mockIsMobile.mockReturnValue(true);
        renderWithProviders(<OpenInAppButton path="verify" token="tok123" />);
        expect(screen.getByTestId("open-in-app")).toHaveAttribute("href", "beyou://verify?token=tok123");
    });
});
