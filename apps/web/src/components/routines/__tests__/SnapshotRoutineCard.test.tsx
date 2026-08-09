import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../test/test-utils';
import { SnapshotRoutineCard } from '../SnapshotRoutineCard';
import { checkSnapshotItem, skipSnapshotItem } from '@beyou/api/routine/snapshot';
import { Snapshot, SnapshotCheck, SnapshotStructureSection } from '@beyou/types/routine/snapshot';

/**
 * O cartão do histórico no desenho do nativo: a faixa de resumo em cima e uma
 * ficha por seção, tudo aberto. As medalhas (Seções / Concluído / Progresso), a
 * barra de porcentagem e o chevron saíram — a página já diz, no cabeçalho, que
 * se está olhando o histórico.
 */

// Mock modules that the component depends on
vi.mock('@beyou/api/routine/snapshot', () => ({
    getSnapshot: vi.fn(() => Promise.resolve({ success: undefined })),
    checkSnapshotItem: vi.fn(() => Promise.resolve({ success: {} })),
    skipSnapshotItem: vi.fn(() => Promise.resolve({ success: {} })),
}));

vi.mock('../../../hooks/useUiRefresh', () => ({
    default: vi.fn(),
}));

vi.mock('../../../ui/BeyouIcon', () => ({
    __esModule: true,
    default: () => null,
}));

vi.mock('react-toastify', () => ({
    toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@beyou/api/apiError', () => ({
    getFriendlyErrorMessage: (_t: unknown, error: unknown) => (error as Error)?.message ?? 'Error',
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const buildCheck = (overrides: Partial<SnapshotCheck> = {}): SnapshotCheck => ({
    id: 'check-1',
    itemType: 'HABIT',
    itemName: 'Drink water',
    itemIconId: 'water',
    sectionName: 'Morning',
    originalGroupId: 'group-1',
    difficulty: 3,
    importance: 4,
    checked: false,
    skipped: false,
    checkTime: null,
    xpGenerated: 0,
    ...overrides,
});

const buildSection = (overrides: Partial<SnapshotStructureSection> = {}): SnapshotStructureSection => ({
    name: 'Morning',
    iconId: 'sun',
    orderIndex: 0,
    startTime: '07:00',
    endTime: '10:00',
    items: [
        {
            type: 'HABIT',
            groupId: 'group-1',
            itemId: 'habit-1',
            name: 'Drink water',
            iconId: 'water',
            startTime: '07:00',
            endTime: '07:30',
        },
    ],
    ...overrides,
});

const buildSnapshot = (overrides: Partial<Snapshot> = {}): Snapshot => ({
    id: 'snap-1',
    routineId: 'routine-1',
    snapshotDate: '2025-06-15',
    routineName: 'Morning Routine',
    routineIconId: 'sunrise',
    completed: false,
    structure: {
        sections: [buildSection()],
    },
    checks: [buildCheck()],
    ...overrides,
});

/** Duas seções, um item em cada, para os casos de contagem. */
const twoSections = (checks: SnapshotCheck[]) =>
    buildSnapshot({
        checks,
        structure: {
            sections: [
                buildSection(),
                buildSection({
                    name: 'Evening',
                    orderIndex: 1,
                    items: [
                        {
                            type: 'TASK',
                            groupId: 'group-2',
                            itemId: 'task-1',
                            name: 'Read',
                            iconId: 'book',
                            startTime: '20:00',
                            endTime: '20:30',
                        },
                    ],
                }),
            ],
        },
    });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SnapshotRoutineCard', () => {
    it('renders the routine name and the date', () => {
        renderWithProviders(<SnapshotRoutineCard snapshot={buildSnapshot()} routineId="r-1" />);

        expect(screen.getByText('Morning Routine')).toBeInTheDocument();
        expect(
            screen.getByText(new Date('2025-06-15').toLocaleDateString()),
        ).toBeInTheDocument();
    });

    it('sums done, skipped and XP in the summary strip', () => {
        const snapshot = twoSections([
            buildCheck({ id: 'c1', originalGroupId: 'group-1', checked: true, xpGenerated: 30 }),
            buildCheck({ id: 'c2', originalGroupId: 'group-2', skipped: true, xpGenerated: 20 }),
        ]);

        renderWithProviders(<SnapshotRoutineCard snapshot={snapshot} routineId="r-1" />);

        expect(screen.getByText('Completed: 1')).toBeInTheDocument();
        expect(screen.getByText('Skipped: 1')).toBeInTheDocument();
        // Só o que foi CONCLUÍDO conta XP — pular não paga. O `t()` do setup
        // devolve a própria chave, então a asserção mira o número.
        expect(screen.getByText(/^30\s/)).toBeInTheDocument();
    });

    it('shows every section and its items without an expand step', () => {
        const snapshot = twoSections([
            buildCheck({ id: 'c1', originalGroupId: 'group-1' }),
            buildCheck({ id: 'c2', originalGroupId: 'group-2', itemName: 'Read' }),
        ]);

        renderWithProviders(<SnapshotRoutineCard snapshot={snapshot} routineId="r-1" />);

        expect(screen.getByText('Morning')).toBeInTheDocument();
        expect(screen.getByText('Evening')).toBeInTheDocument();
        expect(screen.getByText('Drink water')).toBeInTheDocument();
        expect(screen.getByText('Read')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /expand/i })).not.toBeInTheDocument();
    });

    it('reflects the checked state on the checkbox', () => {
        const snapshot = buildSnapshot({
            checks: [buildCheck({ id: 'c1', checked: true, xpGenerated: 10 })],
        });

        renderWithProviders(<SnapshotRoutineCard snapshot={snapshot} routineId="r-1" />);

        expect(screen.getByRole('checkbox', { name: 'Drink water' })).toBeChecked();
    });

    it('checks an item through the API', () => {
        renderWithProviders(<SnapshotRoutineCard snapshot={buildSnapshot()} routineId="r-1" />);

        fireEvent.click(screen.getByRole('checkbox', { name: 'Drink water' }));

        expect(checkSnapshotItem).toHaveBeenCalledWith('snap-1', 'check-1', expect.anything());
    });

    it('skips an item, and offers to undo it afterwards', () => {
        const { unmount } = renderWithProviders(
            <SnapshotRoutineCard snapshot={buildSnapshot()} routineId="r-1" />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
        expect(skipSnapshotItem).toHaveBeenCalledWith('snap-1', 'check-1', expect.anything());
        unmount();

        const skipped = buildSnapshot({ checks: [buildCheck({ skipped: true })] });
        renderWithProviders(<SnapshotRoutineCard snapshot={skipped} routineId="r-1" />);
        expect(screen.getByRole('button', { name: 'Undo skip' })).toBeInTheDocument();
    });

    /** Item concluído não tem o que pular. */
    it('hides the skip button once the item is done', () => {
        const snapshot = buildSnapshot({ checks: [buildCheck({ checked: true })] });

        renderWithProviders(<SnapshotRoutineCard snapshot={snapshot} routineId="r-1" />);

        expect(screen.queryByRole('button', { name: /skip/i })).not.toBeInTheDocument();
    });

    /** Item da estrutura sem check ainda aparece — só não tem controles. */
    it('lists a structure item that has no check', () => {
        const snapshot = buildSnapshot({ checks: [] });

        renderWithProviders(<SnapshotRoutineCard snapshot={snapshot} routineId="r-1" />);

        expect(screen.getByText('Drink water')).toBeInTheDocument();
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });
});
