import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders } from "../../test/test-utils";

/**
 * Real translations, switchable language — the global setupTests stub returns
 * the key itself, which cannot prove the console reads in both languages.
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

const mockListItems = vi.fn();
const mockGetCounts = vi.fn();
const mockGetItem = vi.fn();
const mockUpdateStatus = vi.fn();
const mockCreateReply = vi.fn();
const mockFetchAttachment = vi.fn();

vi.mock("@beyou/api/feedback/listFeedbackAdminItems", () => ({
    default: (...args: unknown[]) => mockListItems(...args)
}));
vi.mock("@beyou/api/feedback/getFeedbackAdminCounts", () => ({
    default: (...args: unknown[]) => mockGetCounts(...args)
}));
vi.mock("@beyou/api/feedback/getFeedbackAdminItem", () => ({
    default: (...args: unknown[]) => mockGetItem(...args)
}));
vi.mock("@beyou/api/feedback/updateFeedbackStatus", () => ({
    default: (...args: unknown[]) => mockUpdateStatus(...args)
}));
vi.mock("@beyou/api/feedback/createFeedbackReply", () => ({
    default: (...args: unknown[]) => mockCreateReply(...args)
}));
vi.mock("./attachmentObjectUrl", () => ({
    fetchAttachmentObjectUrl: (...args: unknown[]) => mockFetchAttachment(...args)
}));

vi.mock("../../components/useAuthGuard", () => ({ default: () => null }));

import AdminFeedback from "./AdminFeedback";

const bugItem = {
    id: "fb-1",
    category: "BUG",
    status: "OPEN",
    body: "The routine check-in double-counts XP",
    context: { screen: "/routines", appVersion: "1.4.0", platform: "web" },
    submitter: { id: "u-1", name: "Ana", email: "ana@example.com" },
    createdAt: "2026-07-20T10:00:00",
    updatedAt: "2026-07-20T10:00:00"
};

const ideaItem = {
    id: "fb-2",
    category: "FEATURE_REQUEST",
    status: "TAKING_CARE",
    body: "Dark mode for the widgets",
    submitter: { id: "u-2", name: "Bruno", email: "bruno@example.com" },
    createdAt: "2026-07-21T10:00:00",
    updatedAt: "2026-07-21T10:00:00"
};

const pageOf = (items: unknown[]) => ({
    success: { items, page: 0, size: 20, totalItems: items.length, totalPages: 1 }
});

const renderConsole = () => renderWithProviders(<AdminFeedback />, { route: "/admin/feedback" });

const openFirstRow = async () => {
    fireEvent.click(await screen.findByTestId("admin-feedback-row-fb-1"));
    const detail = await screen.findByTestId("admin-feedback-detail");
    // The panel mounts before its fetch resolves; wait for loaded content.
    await within(detail).findByTestId("admin-feedback-status-control");
    return detail;
};

beforeEach(() => {
    locale.current = "en";
    mockListItems.mockReset().mockResolvedValue(pageOf([bugItem, ideaItem]));
    // Counts are deliberately unrelated to the two loaded rows: if the tiles ever
    // start counting the page, these numbers stop matching.
    mockGetCounts.mockReset().mockResolvedValue({
        success: { open: 12, takingCare: 3, closed: 40, total: 55 }
    });
    mockGetItem.mockReset().mockResolvedValue({
        success: { ...bugItem, attachments: [], replies: [] }
    });
    mockUpdateStatus.mockReset().mockImplementation((id: string, status: string) =>
        Promise.resolve({ success: { ...bugItem, id, status } })
    );
    mockCreateReply.mockReset().mockResolvedValue({
        success: {
            id: "rep-1",
            feedbackId: "fb-1",
            body: "On it.",
            authorName: "Owner",
            createdAt: "2026-07-22T10:00:00"
        }
    });
    mockFetchAttachment.mockReset().mockResolvedValue("blob:attachment-1");
    // jsdom has no object-URL implementation; the attachment cleanup revokes one.
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(() => "blob:stub");
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
});

describe("Admin feedback console", () => {
    test("lists the submissions the API returned", async () => {
        renderConsole();

        expect(await screen.findByText("The routine check-in double-counts XP")).toBeInTheDocument();
        expect(screen.getByText("Dark mode for the widgets")).toBeInTheDocument();
        expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    });

    test("renders in Portuguese", async () => {
        locale.current = "pt";
        renderConsole();

        expect(await screen.findByText("Caixa de feedback")).toBeInTheDocument();
    });

    test("renders the counts from the counts endpoint, not from the loaded page", async () => {
        renderConsole();

        const counts = await screen.findByTestId("admin-feedback-counts");
        await waitFor(() =>
            expect(within(counts).getByTestId("admin-feedback-count-open")).toHaveTextContent("12")
        );
        expect(within(counts).getByTestId("admin-feedback-count-takingCare")).toHaveTextContent("3");
        expect(within(counts).getByTestId("admin-feedback-count-closed")).toHaveTextContent("40");
        expect(within(counts).getByTestId("admin-feedback-count-total")).toHaveTextContent("55");
        expect(mockGetCounts).toHaveBeenCalled();
    });

    test("filters by status", async () => {
        renderConsole();
        await screen.findByTestId("admin-feedback-row-fb-1");

        fireEvent.change(screen.getByTestId("admin-feedback-filter-status"), {
            target: { value: "CLOSED" }
        });

        await waitFor(() =>
            expect(mockListItems).toHaveBeenLastCalledWith(
                expect.objectContaining({ status: "CLOSED", page: 0 }),
                expect.anything()
            )
        );
    });

    test("filters by category", async () => {
        renderConsole();
        await screen.findByTestId("admin-feedback-row-fb-1");

        fireEvent.change(screen.getByTestId("admin-feedback-filter-category"), {
            target: { value: "FEATURE_REQUEST" }
        });

        await waitFor(() =>
            expect(mockListItems).toHaveBeenLastCalledWith(
                expect.objectContaining({ category: "FEATURE_REQUEST", page: 0 }),
                expect.anything()
            )
        );
    });

    test("a status change updates the row and notifies nobody", async () => {
        renderConsole();
        const detail = await openFirstRow();

        fireEvent.change(within(detail).getByTestId("admin-feedback-status-control"), {
            target: { value: "TAKING_CARE" }
        });

        await waitFor(() =>
            expect(mockUpdateStatus).toHaveBeenCalledWith("fb-1", "TAKING_CARE", expect.anything())
        );
        const row = await screen.findByTestId("admin-feedback-row-fb-1");
        await waitFor(() => expect(within(row).getByText("Taking care")).toBeInTheDocument());
        // R15: a re-status is internal. Nothing may reach the submitter.
        expect(mockCreateReply).not.toHaveBeenCalled();
    });

    test("submitting a reply calls the reply operation exactly once", async () => {
        renderConsole();
        const detail = await openFirstRow();

        fireEvent.change(within(detail).getByTestId("admin-feedback-reply-body"), {
            target: { value: "Fixed in the next release." }
        });
        fireEvent.click(within(detail).getByTestId("admin-feedback-reply-send"));

        await waitFor(() => expect(mockCreateReply).toHaveBeenCalledTimes(1));
        expect(mockCreateReply).toHaveBeenCalledWith(
            "fb-1",
            "Fixed in the next release.",
            expect.anything()
        );
        expect(await screen.findByText("On it.")).toBeInTheDocument();
    });

    test("refuses to send an empty reply and never calls the API", async () => {
        renderConsole();
        const detail = await openFirstRow();

        fireEvent.click(within(detail).getByTestId("admin-feedback-reply-send"));

        expect(await within(detail).findByText("Write a reply before sending.")).toBeInTheDocument();
        expect(mockCreateReply).not.toHaveBeenCalled();
    });

    test("renders the context and the attachments in the detail view", async () => {
        mockGetItem.mockResolvedValue({
            success: {
                ...bugItem,
                attachments: [
                    {
                        id: "att-1",
                        feedbackId: "fb-1",
                        url: "/feedback/fb-1/attachments/att-1",
                        contentType: "image/jpeg",
                        width: 800,
                        height: 600,
                        sizeBytes: 1024,
                        createdAt: "2026-07-20T10:00:00"
                    }
                ],
                replies: []
            }
        });

        renderConsole();
        const detail = await openFirstRow();

        expect(within(detail).getByText(/\/routines/)).toBeInTheDocument();
        expect(within(detail).getByText(/1\.4\.0/)).toBeInTheDocument();

        const image = await within(detail).findByTestId("admin-feedback-attachment-att-1");
        expect(image).toHaveAttribute("src", "blob:attachment-1");
        expect(mockFetchAttachment).toHaveBeenCalledWith("/feedback/fb-1/attachments/att-1");
    });

    test("surfaces a load failure instead of an empty list", async () => {
        mockListItems.mockResolvedValue({ error: { errorKey: "ACCESS_DENIED" } });

        renderConsole();

        expect(await screen.findByTestId("admin-feedback-error")).toBeInTheDocument();
    });
});
