import { render, screen } from "@testing-library/react";
import MobileBrand from "./MobileBrand";

test("renders the brand mark, the wordmark and the tagline", () => {
    render(<MobileBrand />);
    expect(screen.getByTestId("mobile-brand")).toBeInTheDocument();
    // O símbolo é SVG inline (não mais um PNG), rotulado com a marca.
    expect(screen.getByRole("img", { name: "beyou" })).toBeInTheDocument();
    expect(screen.getByText("beyou")).toBeInTheDocument();
    expect(screen.getByText("YourFavoriteHT")).toBeInTheDocument();
});
