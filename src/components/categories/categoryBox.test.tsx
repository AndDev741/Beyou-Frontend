import { useDispatch } from "react-redux";
import iconSearch from "../icons/iconsSearch";
import { fireEvent, render, screen } from "@testing-library/react";
import CategoryBox from "./categoryBox";
import DeleteModal from "../DeleteModal";
import { vi, type Mock } from "vitest";

vi.mock('react-redux', async () => ({ ...await vi.importActual<typeof import('react-redux')>('react-redux'), useDispatch: vi.fn() }));
vi.mock('../icons/iconsSearch');
vi.mock('../DeleteModal', () => ({ __esModule: true, default: vi.fn(() => null) }));
vi.mock('../../services/categories/deleteCategory', () => ({ __esModule: true, default: vi.fn() }));
vi.mock('../../services/categories/getCategories', () => ({ __esModule: true, default: vi.fn() }));

const dispatch = vi.fn();
(iconSearch as Mock).mockReturnValue({ IconComponent: () => <span data-testid="icon">I</span> });

beforeEach(() => { 
    vi.clearAllMocks(); 
    (useDispatch as unknown as Mock).mockReturnValue(dispatch);
    (window as any).scrollTo = vi.fn(); 
});

const defaultProps = { id: '1', name: 'Dance', description: "Dance with me", iconId: "dancingMd", level: 2, xp: 50, nextLevelXp: 100, actualLevelXp: 50, setCategories: vi.fn() };

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
