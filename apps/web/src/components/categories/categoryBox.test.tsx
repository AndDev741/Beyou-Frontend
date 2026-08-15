import { useDispatch } from "react-redux";
import { fireEvent, render, screen } from "@testing-library/react";
import CategoryBox from "./categoryBox";
import DeleteModal from "../DeleteModal";
import { vi, type Mock } from "vitest";

vi.mock('react-redux', async () => ({ ...await vi.importActual<typeof import('react-redux')>('react-redux'), useDispatch: vi.fn() }));
vi.mock('../../ui/BeyouIcon', () => ({ __esModule: true, default: () => <span data-testid="icon">I</span> }));
vi.mock('../DeleteModal', () => ({ __esModule: true, default: vi.fn(() => null) }));
vi.mock('@beyou/api/categories/deleteCategory', () => ({ __esModule: true, default: vi.fn() }));
vi.mock('@beyou/api/categories/getCategories', () => ({ __esModule: true, default: vi.fn() }));

const dispatch = vi.fn();

beforeEach(() => {
    vi.clearAllMocks();
    (useDispatch as unknown as Mock).mockReturnValue(dispatch);
});

const defaultProps = { id: '1', name: 'Dance', description: "Dance with me", iconId: "lucide:music", level: 2, xp: 50, nextLevelXp: 100, actualLevelXp: 50 };

test('Render collapsed compact card', () => {
    render(<CategoryBox {...defaultProps} />);
    expect(screen.getByText('Dance')).toBeInTheDocument();
    expect(screen.getByText('Dance with me')).toBeInTheDocument();
    // The actions live in the header — on desktop they only appear on hover, but
    // they exist in the DOM and in the accessible name.
    expect(screen.getByRole('button', { name: /Edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
    // The expand chevron is always visible — it is what shows where the category
    // is used.
    expect(screen.getByRole('button', { name: /Expand/i })).toBeInTheDocument();
    expect(screen.getByText(/LV 2/i)).toBeInTheDocument();
});

test('expanding reveals where the category is used', () => {
    const habits = new Map([['h1', 'Habit One']]);
    render(<CategoryBox {...defaultProps} habits={habits} />);

    fireEvent.click(screen.getByRole('button', { name: /Expand/i }));

    expect(screen.getByText('Habit One')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Collapse/i })).toBeInTheDocument();
});

test('dispatches edit actions', () => {
    render(<CategoryBox {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Edit/i }));
    expect(dispatch).toHaveBeenCalled();
});

test('sets delete modal on', () => {
    render(<CategoryBox {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Delete/i }));
    expect(DeleteModal).toHaveBeenCalledWith(expect.objectContaining({ onDelete: true }), expect.anything());
});

/**
 * The chart the redesign wanted on the widgets, extended to the card that owns the
 * category. The level bar says where it stands; this says what it has been doing.
 */
test("keeps the week behind the chevron, with the level always visible", () => {
    const { container } = render(<CategoryBox {...defaultProps} xpSeries={[0, 4, 0, 10, 2, 0, 8]} />);

    // Closed, a category is a name, a description and where it stands. Twelve open
    // charts turned the page into a wall of them.
    expect(container.querySelectorAll('[data-testid="xp-bar"]')).toHaveLength(0);
    // The week's total stays: it is one number, and it is the metadata half of the ask.
    expect(screen.getByText("+24")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Expand"));

    expect(container.querySelectorAll('[data-testid="xp-bar"]')).toHaveLength(7);
});

/**
 * A category created this morning has no week. Seven empty slots would read as "you did
 * nothing", when the truth is there was nothing to do yet.
 */
test("shows no chart at all when the category has no history", () => {
    const { container } = render(<CategoryBox {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Expand"));

    // A category created this morning: seven empty slots would read as "you did
    // nothing", when the truth is there was nothing to record yet.
    expect(container.querySelectorAll('[data-testid="xp-bar"]')).toHaveLength(0);
});

/** XP handed back was not earned, so the total nets out rather than counting twice. */
test("nets a returned day out of the week's total", () => {
    render(<CategoryBox {...defaultProps} xpSeries={[10, -10, 5]} />);

    expect(screen.getByText("+5")).toBeInTheDocument();
});
