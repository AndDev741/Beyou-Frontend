import { render, screen } from "@testing-library/react";
import ConfigSection from "./ConfigSection";

test("renders heading, description and children", () => {
    render(
        <ConfigSection icon={<span>i</span>} title="ConfigSectionProfile" description="ConfigSectionProfileDesc">
            <p>child-content</p>
        </ConfigSection>
    );
    expect(screen.getByRole("heading", { name: "ConfigSectionProfile" })).toBeInTheDocument();
    expect(screen.getByText("ConfigSectionProfileDesc")).toBeInTheDocument();
    expect(screen.getByText("child-content")).toBeInTheDocument();
});
