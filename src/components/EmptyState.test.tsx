import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/test-utils";
import EmptyState from "./EmptyState";

test("renders title, description and action link", () => {
    renderWithProviders(
        <EmptyState
            emoji="🧩"
            title="NoWidgetsTitle"
            description="NoWidgetsDescription"
            actionLabel="AddWidgets"
            actionTo="/configuration"
            testId="empty"
        />
    );
    expect(screen.getByText("NoWidgetsTitle")).toBeInTheDocument();
    expect(screen.getByText("NoWidgetsDescription")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "AddWidgets" })).toHaveAttribute("href", "/configuration");
});

test("renders without optional action", () => {
    renderWithProviders(<EmptyState emoji="🌱" title="0HabitsTitle" testId="empty" />);
    expect(screen.getByText("0HabitsTitle")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
});
