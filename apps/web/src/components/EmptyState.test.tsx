import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LayoutGrid } from "lucide-react";
import { renderWithProviders } from "../test/test-utils";
import EmptyState from "./EmptyState";

const icon = <LayoutGrid size={20} data-testid="entity-icon" aria-hidden="true" />;

test("renders title, description and action link", () => {
    renderWithProviders(
        <EmptyState
            icon={icon}
            title="NoWidgetsTitle"
            description="NoWidgetsDescription"
            actionLabel="AddWidgets"
            actionTo="/configuration"
            testId="empty"
        />
    );
    expect(screen.getByText("NoWidgetsTitle")).toBeInTheDocument();
    expect(screen.getByText("NoWidgetsDescription")).toBeInTheDocument();
    expect(screen.getByTestId("entity-icon")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "AddWidgets" })).toHaveAttribute("href", "/configuration");
});

test("renders without optional action", () => {
    renderWithProviders(<EmptyState icon={icon} title="0HabitsTitle" testId="empty" />);
    expect(screen.getByText("0HabitsTitle")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

test("calls onAction and onSecondary when there is no route", async () => {
    const onAction = vi.fn();
    const onSecondary = vi.fn();
    renderWithProviders(
        <EmptyState
            icon={icon}
            title="0RoutinesTitle"
            actionLabel="Create routine"
            onAction={onAction}
            secondaryLabel="OrAskTheAssistant"
            onSecondary={onSecondary}
        />
    );

    await userEvent.click(screen.getByRole("button", { name: "Create routine" }));
    await userEvent.click(screen.getByRole("button", { name: "OrAskTheAssistant" }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onSecondary).toHaveBeenCalledTimes(1);
});

test("shows the dismiss button only when a handler is given", async () => {
    const onDismiss = vi.fn();
    const { rerender } = renderWithProviders(<EmptyState icon={icon} title="NoWidgetsTitle" />);
    expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument();

    rerender(<EmptyState icon={icon} title="NoWidgetsTitle" onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
});
