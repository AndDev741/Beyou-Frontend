import { render, screen } from "@testing-library/react";
import ConfigSection from "./ConfigSection";

test("renders heading and children", () => {
    render(
        <ConfigSection title="ConfigSectionProfile">
            <p>child-content</p>
        </ConfigSection>
    );
    expect(screen.getByRole("heading", { name: "ConfigSectionProfile" })).toBeInTheDocument();
    expect(screen.getByText("child-content")).toBeInTheDocument();
});
