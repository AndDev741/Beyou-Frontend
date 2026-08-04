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
    (window as any).scrollTo = vi.fn();
});

const defaultProps = { id: '1', name: 'Dance', description: "Dance with me", iconId: "lucide:music", level: 2, xp: 50, nextLevelXp: 100, actualLevelXp: 50 };

test('Render collapsed compact card', () => {
    render(<CategoryBox {...defaultProps} />);
    expect(screen.getByText('Dance')).toBeInTheDocument();
    expect(screen.getByText('Dance with me')).toBeInTheDocument();
    // As ações vivem no cabeçalho — no desktop só aparecem no hover, mas
    // existem no DOM e no nome acessível.
    expect(screen.getByRole('button', { name: /Edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
    // O cartão é compacto: sem estado expandido no desenho do mockup.
    expect(screen.queryByRole('button', { name: /Expand/i })).toBeNull();
    expect(screen.getByText(/LV 2/i)).toBeInTheDocument();
});

test('dispatches edit actions and scrolls', () => {
    render(<CategoryBox {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Edit/i }));
    expect((window as any).scrollTo).toHaveBeenCalled();
});

test('sets delete modal on', () => {
    render(<CategoryBox {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Delete/i }));
    expect(DeleteModal).toHaveBeenCalledWith(expect.objectContaining({ onDelete: true }), expect.anything());
});
