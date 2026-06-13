import { render, screen } from "@testing-library/react";
import MobileBrand from "./MobileBrand";

test("renders logo, app name and tagline", () => {
    render(<MobileBrand />);
    expect(screen.getByTestId("mobile-brand")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "LogoAlt" })).toBeInTheDocument();
    expect(screen.getByText("BeYou")).toBeInTheDocument();
    expect(screen.getByText("YourFavoriteHT")).toBeInTheDocument();
});
