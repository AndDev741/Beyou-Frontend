import { screen } from "@testing-library/react";
import { act } from "react";
import Categories from "../../pages/categories/categories";
import getCategories from "../../services/categories/getCategories";
import { renderWithProviders } from "../../test/test-utils";
import { vi, type Mock } from "vitest";

vi.mock('../../services/categories/getCategories', () => ({
    __esModule: true,
    default: vi.fn(),
}));

test('Should show a custom message of 0 categories created', async () => {
    (getCategories as Mock).mockResolvedValue({ success: [] });

    await act(async () => {
        renderWithProviders(<Categories />);
    });

    const message = await screen.findByText('0CategoriesMessage');
    expect(message).toBeInTheDocument();
});

test('Should render the received categories', async () => {
    const fakeCategories = [
        { id: '1', name: 'Saúde', xp: 10, nextLevelXp: 50, actualLevelXp: 10, iconId: 'icon1', level: 1 },
        { id: '2', name: 'Trabalho', xp: 20, nextLevelXp: 50, actualLevelXp: 20, iconId: 'icon2', level: 1 },
    ];

    (getCategories as Mock).mockResolvedValue({ success: fakeCategories });

    await act(async () => {
        renderWithProviders(<Categories />);
    });

    for (const cat of fakeCategories) {
        const elemenmt = await screen.findByText(cat.name);
        expect(elemenmt).toBeInTheDocument();
    }
})
