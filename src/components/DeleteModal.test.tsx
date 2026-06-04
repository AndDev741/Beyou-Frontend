import { renderWithProviders } from "../test/test-utils";
import DeleteModal from "./DeleteModal";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import type { TFunction } from "i18next";

/**
 * DeleteModal is the shared destructive-confirmation dialog used by the
 * category/habit/task/goal cards. These tests pin its accessibility contract
 * (real dialog semantics, keyboard support, focus management) and the
 * delete → refresh flow.
 */
const t = ((key: string) => key) as unknown as TFunction;

function setup(overrides: Record<string, unknown> = {}) {
    const props = {
        objectId: "obj-1",
        onDelete: true,
        setOnDelete: vi.fn(),
        t,
        name: "My Habit",
        setObjects: vi.fn(),
        deleteObject: vi.fn().mockResolvedValue({ success: "deleted" }),
        getObjects: vi.fn().mockResolvedValue({ success: [{ id: "h-2", name: "Remaining" }] }),
        deletePhrase: "DeleteHabitPhrase",
        mode: "habit" as const,
        ...overrides,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderWithProviders(<DeleteModal {...(props as any)} />);
    return props;
}

test("renders as an accessible dialog named by the delete phrase", () => {
    setup();

    const dialog = screen.getByRole("dialog", { name: "DeleteHabitPhrase" });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
});

test("moves focus into the dialog when it opens", () => {
    setup();

    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
});

test("Escape closes the dialog without deleting", () => {
    const props = setup();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(props.setOnDelete).toHaveBeenCalledWith(false);
    expect(props.deleteObject).not.toHaveBeenCalled();
});

test("Tab from the last focusable element wraps back into the dialog", () => {
    setup();

    const dialog = screen.getByRole("dialog");
    const buttons = screen.getAllByRole("button");
    const last = buttons[buttons.length - 1];
    last.focus();

    fireEvent.keyDown(dialog, { key: "Tab" });

    // Focus must stay trapped inside the dialog rather than escaping to the page.
    expect(dialog.contains(document.activeElement)).toBe(true);
});

test("cancel closes without calling the delete service", () => {
    const props = setup();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(props.setOnDelete).toHaveBeenCalledWith(false);
    expect(props.deleteObject).not.toHaveBeenCalled();
});

test("confirming deletes, refreshes the list, and closes", async () => {
    const props = setup();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
        expect(props.deleteObject).toHaveBeenCalledWith("obj-1", t);
        expect(props.setObjects).toHaveBeenCalledWith([{ id: "h-2", name: "Remaining" }]);
        expect(props.setOnDelete).toHaveBeenCalledWith(false);
    });
});

test("shows the API error and stays open when the delete fails", async () => {
    const props = setup({
        deleteObject: vi.fn().mockResolvedValue({
            error: { errorKey: "HABIT_NOT_OWNED", message: "nope" },
        }),
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
        expect(screen.getByText("HABIT_NOT_OWNED")).toBeInTheDocument();
    });
    expect(props.setOnDelete).not.toHaveBeenCalledWith(false);
});
