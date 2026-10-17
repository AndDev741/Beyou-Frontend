import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, test, vi, type Mock } from "vitest";
import { toast } from "react-toastify";
import rootReducer from "@beyou/state/rootReducer";
import { createQuickNote } from "@beyou/api/quickNote/quickNoteApi";
import { renderWithProviders } from "../../test/test-utils";
import QuickCaptureHub from "./QuickCaptureHub";

vi.mock("@beyou/api/quickNote/quickNoteApi", () => ({ createQuickNote: vi.fn() }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const saved = {
    id: "n1",
    text: "Call the plumber",
    color: "YELLOW",
    x: 0,
    y: 0,
    z: 1,
    archivedAt: null,
    convertedTaskId: null,
    createdAt: "2026-10-17T10:00:00Z",
    updatedAt: "2026-10-17T10:00:00Z",
};

/** Option+N on a Mac: `key` is a dead key, `code` is still KeyN. */
const altN = (target: Element = document.body) => fireEvent.keyDown(target, { key: "Dead", code: "KeyN", altKey: true });

const renderAt = (route: string) => {
    const store = configureStore({ reducer: rootReducer });
    renderWithProviders(
        <>
            <input aria-label="some field" />
            <QuickCaptureHub />
        </>,
        { storeOverride: store, route },
    );
    return store;
};

describe("QuickCaptureHub", () => {
    test("Alt+N opens New idea anywhere in the app; Enter saves with no spot, closes and says so", async () => {
        (createQuickNote as Mock).mockResolvedValue({ success: saved });
        const store = renderAt("/dashboard");
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

        altN();

        const dialog = await screen.findByRole("dialog", { name: "IdeasCaptureLabel" });
        const field = within(dialog).getByLabelText("IdeasCaptureLabel");
        expect(field).toHaveFocus();
        fireEvent.change(field, { target: { value: "Call the plumber" } });
        fireEvent.keyDown(field, { key: "Enter" });

        await waitFor(() => expect(createQuickNote).toHaveBeenCalledWith({ text: "Call the plumber" }, expect.any(Function)));
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(toast.success).toHaveBeenCalledWith("IdeasCapturedToast");
        expect(store.getState().quickNotes.active.map((n) => n.id)).toEqual(["n1"]);
    });

    test("a refused save stays open with the reason", async () => {
        (createQuickNote as Mock).mockResolvedValue({ error: { errorKey: "QUICK_NOTE_LIMIT_REACHED" } });
        renderAt("/tasks");

        altN();
        const dialog = await screen.findByRole("dialog", { name: "IdeasCaptureLabel" });
        const field = within(dialog).getByLabelText("IdeasCaptureLabel");
        fireEvent.change(field, { target: { value: "One more" } });
        fireEvent.keyDown(field, { key: "Enter" });

        expect(await within(dialog).findByRole("alert")).toHaveTextContent("QUICK_NOTE_LIMIT_REACHED");
        expect(screen.getByRole("dialog", { name: "IdeasCaptureLabel" })).toBeInTheDocument();
    });

    test("leaves Alt+N alone inside a text field, where Option+N types the tilde of não", () => {
        renderAt("/dashboard");

        altN(screen.getByLabelText("some field"));

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    test("on the Ideas page the page's own field takes Alt+N instead", () => {
        renderAt("/ideas");

        altN();

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    test("needs Alt with N and nothing else", () => {
        renderAt("/dashboard");

        fireEvent.keyDown(document.body, { key: "n", code: "KeyN" });
        fireEvent.keyDown(document.body, { key: "N", code: "KeyN", altKey: true, shiftKey: true });
        fireEvent.keyDown(document.body, { key: "n", code: "KeyN", altKey: true, ctrlKey: true });

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
});
