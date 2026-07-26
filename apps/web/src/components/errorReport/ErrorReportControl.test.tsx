import { screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders } from "../../test/test-utils";

/**
 * Real translations, switchable language — same override the feedback screen
 * uses. The global setupTests stub returns the key itself, which cannot prove
 * "reads correctly in English and Portuguese".
 */
const locale = vi.hoisted(() => ({ current: "en" as "en" | "pt" }));

vi.mock("react-i18next", async () => {
    const { resources } = await import("@beyou/i18n");
    const interpolate = (template: string, options?: Record<string, unknown>) =>
        template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) =>
            String(options?.[name] ?? `{{${name}}}`)
        );
    const t = (key: string, options?: Record<string, unknown>) => {
        const table = resources[locale.current].translation as Record<string, unknown>;
        const value = table[key];
        return typeof value === "string" ? interpolate(value, options) : key;
    };
    return {
        useTranslation: () => ({
            t,
            i18n: { language: locale.current, changeLanguage: () => Promise.resolve() }
        }),
        Trans: ({ children }: { children: React.ReactNode }) => children
    };
});

const mockSubmitFeedback = vi.fn();
vi.mock("@beyou/api/feedback/submitFeedback", () => ({
    default: (...args: unknown[]) => mockSubmitFeedback(...args)
}));

const mockCaptureScreenshot = vi.fn();
vi.mock("./captureScreenshot", () => ({
    captureScreenshot: (...args: unknown[]) => mockCaptureScreenshot(...args),
    SCREENSHOT_FILE_NAME: "error-screen.png"
}));

import ErrorNotice from "../ErrorNotice";

const sentResult = {
    success: {
        feedback: { id: "fb-1", category: "BUG", body: "boom" },
        attachments: [],
        failedAttachments: []
    }
};

const renderNotice = (error: { errorKey?: string; message?: string } = { errorKey: "INTERNAL_ERROR" }) =>
    renderWithProviders(<ErrorNotice error={error} />);

const openReport = () =>
    fireEvent.click(screen.getByRole("button", { name: /Report this problem|Relatar este problema/ }));

const sendReport = () =>
    fireEvent.click(screen.getByRole("button", { name: /Send report|Enviar relato/ }));

beforeEach(() => {
    locale.current = "en";
    mockSubmitFeedback.mockReset().mockResolvedValue(sentResult);
    mockCaptureScreenshot.mockReset().mockResolvedValue(null);
    window.history.pushState({}, "", "/habits");
});

describe("Reporting from a non-fatal error surface", () => {
    /**
     * AE1. The capture is a nice-to-have; the report is the deliverable. If a
     * failed screenshot could swallow the submission — or even just change what
     * the user is told — the most useful bug reports would be the ones that
     * silently never arrive.
     */
    test("a failed capture still sends the report with the error text and context, and confirms identically", async () => {
        mockCaptureScreenshot.mockRejectedValue(new Error("snapdom exploded"));

        renderNotice({ errorKey: "INTERNAL_ERROR" });
        openReport();
        sendReport();

        expect(await screen.findByText("Thanks — we got it.")).toBeInTheDocument();
        expect(screen.getByTestId("error-report-success")).toBeInTheDocument();

        expect(mockSubmitFeedback).toHaveBeenCalledTimes(1);
        const [input] = mockSubmitFeedback.mock.calls[0];
        expect(input.category).toBe("BUG");
        expect(input.body).toContain("INTERNAL_ERROR");
        expect(input.attachments).toBeUndefined();
        expect(input.context).toMatchObject({
            screen: "/habits",
            platform: "web",
            language: "en",
            theme: "beYou"
        });
    });

    test("a successful capture is attached to the report", async () => {
        const shot = new File(["png-bytes"], "error-screen.png", { type: "image/png" });
        mockCaptureScreenshot.mockResolvedValue(shot);

        renderNotice({ errorKey: "INTERNAL_ERROR" });
        openReport();
        sendReport();

        await waitFor(() => expect(mockSubmitFeedback).toHaveBeenCalledTimes(1));
        const [input] = mockSubmitFeedback.mock.calls[0];
        expect(input.attachments).toEqual([{ blob: shot, name: "error-screen.png" }]);
        expect(await screen.findByText("Thanks — we got it.")).toBeInTheDocument();
    });

    test("declining leaves the error message exactly as it was", async () => {
        renderNotice({ errorKey: "INTERNAL_ERROR" });
        openReport();

        fireEvent.click(screen.getByRole("button", { name: /Not now|Agora não/ }));

        expect(screen.getByText("INTERNAL_ERROR")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /Report this problem/ })
        ).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /Send report/ })).not.toBeInTheDocument();
        expect(mockSubmitFeedback).not.toHaveBeenCalled();
    });

    test("a note the user types rides along with the error text", async () => {
        renderNotice({ errorKey: "INTERNAL_ERROR" });
        openReport();

        fireEvent.change(screen.getByRole("textbox"), {
            target: { value: "Happened right after I checked a habit" }
        });
        sendReport();

        await waitFor(() => expect(mockSubmitFeedback).toHaveBeenCalledTimes(1));
        const [input] = mockSubmitFeedback.mock.calls[0];
        expect(input.body).toContain("Happened right after I checked a habit");
        expect(input.body).toContain("INTERNAL_ERROR");
    });

    test("a submission that never reaches the server falls back to a pre-filled mailto", async () => {
        mockSubmitFeedback.mockResolvedValue({ error: { errorKey: "RATE_LIMIT_EXCEEDED" } });

        renderNotice({ errorKey: "INTERNAL_ERROR" });
        openReport();
        sendReport();

        const mailLink = (await screen.findByTestId("error-report-mailto-fallback")) as HTMLAnchorElement;
        const href = decodeURIComponent(mailLink.getAttribute("href") ?? "");

        expect(href.startsWith("mailto:")).toBe(true);
        expect(href).toContain("Bug");
        expect(href).toContain("INTERNAL_ERROR");
        expect(href).toContain("screen=/habits");
    });

    test("renders in Portuguese", () => {
        locale.current = "pt";
        renderNotice({ errorKey: "INTERNAL_ERROR" });

        expect(screen.getByRole("button", { name: "Relatar este problema" })).toBeInTheDocument();
    });
});
