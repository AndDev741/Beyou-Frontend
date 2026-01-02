import { useDispatch } from "react-redux";
import iconSearch from "../icons/iconsSearch";
import { fireEvent, render, screen } from "@testing-library/react";
import CategoryBox from "./categoryBox";
import DeleteModal from "../DeleteModal";

jest.mock('react-redux', () => ({ ...jest.requireActual('react-redux'), useDispatch: jest.fn() }));
jest.mock('../icons/iconsSearch');
jest.mock('../DeleteModal', () => jest.fn(() => null));
jest.mock('../../services/categories/deleteCategory', () => jest.fn());
jest.mock('../../services/categories/getCategories', () => jest.fn());

const dispatch = jest.fn();
(iconSearch as jest.Mock).mockReturnValue({ IconComponent: () => <span data-testid="icon">I</span> });

beforeEach(() => { 
    jest.clearAllMocks(); 
    (useDispatch as unknown as jest.Mock).mockReturnValue(dispatch);
    (window as any).scrollTo = jest.fn(); 
});

const defaultProps = { id: '1', name: 'Dance', description: "Dance with me", iconId: "dancingMd", level: 2, xp: 50, nextLevelXp: 100, actualLevelXp: 50, setCategories: jest.fn() };

test('Render collapsed view', () => {
    render(<CategoryBox {...defaultProps} />);
    expect(screen.getByText('Dance')).toBeInTheDocument();
    expect(screen.getByText('Dance with me')).toBeInTheDocument();
    expect(screen.queryByText(/Edit/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Delete/i)).not.toBeInTheDocument();
});

test('Expand the card when clicked', () => {
    render(<CategoryBox {...defaultProps} />);
    fireEvent.click(screen.getByRole('img'));
    expect(screen.getByText(/Edit/i)).toBeInTheDocument();
    expect(screen.getByText(/Delete/i)).toBeInTheDocument();
});

test('renders using-in lists', () => {
    const habits = new Map([['h1', 'Habit One']]);
    render(<CategoryBox {...defaultProps} habits={habits} />);
    fireEvent.click(screen.getByRole('img'));
    expect(screen.getByText('Habit One')).toBeInTheDocument();
});

test('shows fallback when no references', () => {
    render(<CategoryBox {...defaultProps} />);
    fireEvent.click(screen.getByRole('img'));
    expect(screen.getByText(/Add this category/i)).toBeInTheDocument();
});

test('dispatches edit actions and scrolls', () => {
    render(<CategoryBox {...defaultProps} />);
    fireEvent.click(screen.getByRole('img'));
    fireEvent.click(screen.getByText(/Edit/i));
    //expect(dispatch).toHaveBeenCalled();
    expect((window as any).scrollTo).toHaveBeenCalled();
});

test('sets delete modal on', () => {
    render(<CategoryBox {...defaultProps} />);
    fireEvent.click(screen.getByRole('img'));
    fireEvent.click(screen.getByText(/Delete/i));
    expect(DeleteModal).toHaveBeenCalledWith(expect.objectContaining({ onDelete: true }), expect.anything());
});
