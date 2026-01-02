import { act } from "react";
import { useSelector } from "react-redux";
import { renderWithProviders } from "../../test/test-utils";
import Categories from "./categories";
import { screen } from "@testing-library/react";

jest.mock('react-redux', () => {
    const actual = jest.requireActual('react-redux');
    return {
        ...actual,
        useSelector: jest.fn(),
    };
});

const mockedUseSelector = useSelector as unknown as jest.Mock;

beforeEach(() => {
    mockedUseSelector.mockReset();
});

test('Should show Create Category Form when editMode false', () => {
    mockedUseSelector.mockReturnValue(false);

    act(() => {
        renderWithProviders(<Categories />);
    })
    
    expect(screen.getByText('CreateCategory')).toBeInTheDocument();
})

test('Should show Edit Category Form when editMode true', () => {
    mockedUseSelector.mockReturnValue(true);

    act(() => {
        renderWithProviders(<Categories />);
    })
    
    expect(screen.getByText('EditCategory')).toBeInTheDocument();
})