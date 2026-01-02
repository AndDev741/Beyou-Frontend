import { screen } from "@testing-library/react";
import Categories from "../../pages/categories/categories";
import getCategories from "../../services/categories/getCategories";
import { renderWithProviders } from "../../test/test-utils";

jest.mock('../../services/categories/getCategories.ts');

test('Should show a custom message of 0 categories created', async () => {
    (getCategories as jest.Mock).mockResolvedValue({ success: [] });

    renderWithProviders(<Categories />);

    const message = await screen.findByText('0CategoriesMessage');
    expect(message).toBeInTheDocument();
});