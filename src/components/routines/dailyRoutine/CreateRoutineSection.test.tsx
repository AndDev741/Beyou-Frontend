import { renderWithProviders } from "../../../test/test-utils";
import CreateRoutineSection from "./CreateRoutineSection";
import { screen, fireEvent } from "@testing-library/react";

test("shows validation errors for empty section fields", async () => {
    renderWithProviders(
        <CreateRoutineSection
            setRoutineSection={() => {}}
            routineSections={[]}
        />
    );

    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    expect(await screen.findByText("RoutineSectionNameRequired")).toBeInTheDocument();
    expect(await screen.findByText("RoutineSectionStartRequired")).toBeInTheDocument();
});
