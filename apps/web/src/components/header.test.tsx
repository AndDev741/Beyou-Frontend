import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/test-utils";
import Header from "./header";

test('Should render a header with the title passed', () => {
    renderWithProviders(<Header pageName="Test" />);

    const heading = screen.getByRole('heading', { name: /test/i });
    expect(heading).toBeInTheDocument();
});

test('Should always offer a route to the feedback screen', () => {
    renderWithProviders(<Header pageName="Test" />);

    expect(screen.getByTestId('header-feedback-link')).toHaveAttribute('href', '/feedback');
});
