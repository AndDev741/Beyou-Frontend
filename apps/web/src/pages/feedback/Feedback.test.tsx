import { screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders } from "../../test/test-utils";

/**
 * Real translations, switchable language. The global setupTests stub returns the
 * key itself, which cannot prove "renders in English and Portuguese" — this
 * override reads the actual EN/PT tables so the bilingual test has teeth.
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
        // Mirror i18next's plural suffix resolution so count-bearing keys read right.
        const pluralKey =
            typeof options?.count === "number"
                ? `${key}_${options.count === 1 ? "one" : "other"}`
                : undefined;
        const value = (pluralKey && table[pluralKey]) ?? table[key];
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

vi.mock("../../components/useAuthGuard", () => ({
    default: () => null
}));

import Feedback from "./Feedback";

const successResult = {
    success: {
        feedback: { id: "fb-1", category: "BUG", body: "It broke" },
        attachments: [],
        failedAttachments: []
    }
};

const renderFeedback = () => renderWithProviders(<Feedback />, { route: "/feedback" });

const fillBody = (text: string) => {
    fireEvent.change(screen.getByRole("textbox", { name: /message|mensagem/i }), {
        target: { value: text }
    });
};

const submit = () => fireEvent.click(screen.getByRole("button", { name: /Send feedback|Enviar feedback/ }));

beforeEach(() => {
    locale.current = "en";
    mockSubmitFeedback.mockReset().mockResolvedValue(successResult);
    // jsdom has no object-URL implementation; previews need one.
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(
        (file: File) => `blob:${file.name}`
    );
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
});

describe("Feedback screen", () => {
    test("renders in English", () => {
        renderFeedback();

        expect(
            screen.getByText("Tell us what is working, what is not, and what you would like to see next.")
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Send feedback" })).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Bug" })).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Feature request" })).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Other" })).toBeInTheDocument();
    });

    test("renders in Portuguese", () => {
        locale.current = "pt";
        renderFeedback();

        expect(
            screen.getByText(
                "Conte o que está funcionando, o que não está e o que você gostaria de ver a seguir."
            )
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Enviar feedback" })).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Erro" })).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Sugestão de recurso" })).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Outro" })).toBeInTheDocument();
    });

    test("blocks submission with no category and shows an inline message", async () => {
        renderFeedback();

        fillBody("Something is off on the dashboard");
        submit();

        expect(await screen.findByText("Choose a category.")).toBeInTheDocument();
        expect(mockSubmitFeedback).not.toHaveBeenCalled();
    });

    test("a successful submission shows confirmation and clears the form", async () => {
        renderFeedback();

        fireEvent.click(screen.getByRole("radio", { name: "Bug" }));
        fillBody("It broke");
        submit();

        expect(await screen.findByText("Thanks — we got it.")).toBeInTheDocument();
        expect(mockSubmitFeedback).toHaveBeenCalledTimes(1);

        await waitFor(() => {
            expect(screen.getByRole("textbox", { name: /message/i })).toHaveValue("");
        });
        expect(screen.getByRole("radio", { name: "Bug" })).not.toBeChecked();
    });

    test("a failed submission surfaces a pre-filled mailto carrying the same category and context", async () => {
        mockSubmitFeedback.mockResolvedValue({ error: { errorKey: "RATE_LIMIT_EXCEEDED" } });
        renderFeedback();

        fireEvent.click(screen.getByRole("radio", { name: "Feature request" }));
        fillBody("Please add streak reminders");
        submit();

        expect(await screen.findByText("We could not send your feedback.")).toBeInTheDocument();

        const mailLink = screen.getByTestId("feedback-mailto-fallback") as HTMLAnchorElement;
        const href = decodeURIComponent(mailLink.getAttribute("href") ?? "");

        expect(href.startsWith("mailto:")).toBe(true);
        // Same category the submission carried…
        expect(href).toContain("Feature request");
        // …and the same automatic context.
        expect(href).toContain("screen=/feedback");
        expect(href).toContain("platform=web");
        expect(href).toContain("language=en");
        expect(href).toContain("theme=light:beyou");
        expect(href).toContain("Please add streak reminders");

        // The client-side context and the mailto context agree.
        const [input] = mockSubmitFeedback.mock.calls[0];
        expect(input.context).toMatchObject({
            screen: "/feedback",
            platform: "web",
            language: "en",
            theme: "light:beyou"
        });
        expect(input.category).toBe("FEATURE_REQUEST");
    });

    test("the submit control is disabled while a request is in flight", async () => {
        let resolveSubmit: (value: unknown) => void = () => {};
        mockSubmitFeedback.mockImplementationOnce(
            () => new Promise((resolve) => { resolveSubmit = resolve; })
        );

        renderFeedback();

        fireEvent.click(screen.getByRole("radio", { name: "Other" }));
        fillBody("Just saying hi");
        submit();

        await waitFor(() => expect(mockSubmitFeedback).toHaveBeenCalledTimes(1));
        expect(screen.getByRole("button", { name: /Sending/ })).toBeDisabled();

        // A second click while in flight must not fire another request.
        fireEvent.click(screen.getByRole("button", { name: /Sending/ }));
        expect(mockSubmitFeedback).toHaveBeenCalledTimes(1);

        resolveSubmit(successResult);
        await screen.findByText("Thanks — we got it.");
    });

    test("selected images appear as previews and are sent with the submission", async () => {
        renderFeedback();

        const first = new File(["a"], "screenshot-1.png", { type: "image/png" });
        const second = new File(["b"], "screenshot-2.jpg", { type: "image/jpeg" });

        fireEvent.change(screen.getByLabelText("Add images"), {
            target: { files: [first, second] }
        });

        const previews = await screen.findAllByAltText(/screenshot-\d/);
        expect(previews).toHaveLength(2);
        expect(previews[0]).toHaveAttribute("src", "blob:screenshot-1.png");

        fireEvent.click(screen.getByRole("radio", { name: "Bug" }));
        fillBody("Here is what I see");
        submit();

        await waitFor(() => expect(mockSubmitFeedback).toHaveBeenCalledTimes(1));
        const [input] = mockSubmitFeedback.mock.calls[0];
        expect(input.attachments).toEqual([
            { blob: first, name: "screenshot-1.png" },
            { blob: second, name: "screenshot-2.jpg" }
        ]);
    });

    test("an image that exceeds the size limit is rejected before it is queued", async () => {
        renderFeedback();

        const huge = new File(["x"], "huge.png", { type: "image/png" });
        Object.defineProperty(huge, "size", { value: 6 * 1024 * 1024 });

        fireEvent.change(screen.getByLabelText("Add images"), { target: { files: [huge] } });

        expect(await screen.findByText("huge.png is larger than 5 MB.")).toBeInTheDocument();
        expect(screen.queryByAltText("huge.png")).not.toBeInTheDocument();
    });

    /**
     * #15. `apiError.ts` calls `t(errorKey)` unconditionally, so a key the
     * backend throws but the locales never define reaches the user verbatim.
     * `FEEDBACK_CREATE_FAILED` is exactly that case.
     */
    test("a backend create failure reads as a sentence, not as a raw error key", async () => {
        mockSubmitFeedback.mockResolvedValue({ error: { errorKey: "FEEDBACK_CREATE_FAILED" } });

        renderFeedback();
        fireEvent.click(screen.getByRole("radio", { name: "Bug" }));
        fillBody("It broke");
        submit();

        const failure = await screen.findByTestId("feedback-failure");
        expect(failure).not.toHaveTextContent("FEEDBACK_CREATE_FAILED");
        expect(failure).toHaveTextContent(/could not be saved/);
    });

    test("a stored submission whose image failed reads as sent, not lost", async () => {
        mockSubmitFeedback.mockResolvedValue({
            success: {
                feedback: { id: "fb-2", category: "BUG", body: "It broke" },
                attachments: [],
                failedAttachments: [
                    { index: 0, name: "screenshot-1.png", error: { errorKey: "FEEDBACK_ATTACHMENT_STORE_FAILED" } }
                ]
            }
        });

        renderFeedback();
        fireEvent.click(screen.getByRole("radio", { name: "Bug" }));
        fillBody("It broke");
        submit();

        expect(await screen.findByText("Thanks — we got it.")).toBeInTheDocument();
        expect(
            screen.getByText("Your feedback was sent, but 1 image could not be attached.")
        ).toBeInTheDocument();
        expect(screen.queryByText("We could not send your feedback.")).not.toBeInTheDocument();
    });
});
