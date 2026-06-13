import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../test/test-utils';
import { SnapshotRoutineCard } from '../SnapshotRoutineCard';
import { Snapshot, SnapshotCheck, SnapshotStructureSection } from '../../../types/routine/snapshot';

// Mock modules that the component depends on
vi.mock('../../../services/routine/snapshot', () => ({
    getSnapshot: vi.fn(() => Promise.resolve({ success: undefined })),
    checkSnapshotItem: vi.fn(() => Promise.resolve({ success: {} })),
    skipSnapshotItem: vi.fn(() => Promise.resolve({ success: {} })),
}));

vi.mock('../../../hooks/useUiRefresh', () => ({
    default: vi.fn(),
}));

vi.mock('../../icons/iconsSearch', () => ({
    default: () => undefined,
}));

vi.mock('react-toastify', () => ({
    toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('../../../services/apiError', () => ({
    getFriendlyErrorMessage: (t: any, error: any) => error?.message ?? 'Error',
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SnapshotRoutineCard', () => {
    it('renders the routine name', () => {
        renderWithProviders(
            <SnapshotRoutineCard snapshot={buildSnapshot()} routineId="r-1" />,
        );

        expect(screen.getByText('Morning Routine')).toBeInTheDocument();
    });

    it('shows the "Historical view" badge', () => {
        renderWithProviders(
            <SnapshotRoutineCard snapshot={buildSnapshot()} routineId="r-1" />,
        );

        expect(screen.getByText('Historical view')).toBeInTheDocument();
    });

    it('displays sections count badge', () => {
        renderWithProviders(
            <SnapshotRoutineCard snapshot={buildSnapshot()} routineId="r-1" />,
        );

        // "1 Sections" rendered together inside a Badge
        expect(screen.getByText(/1\s+Sections/)).toBeInTheDocument();
    });

    it('displays completion count and progress badges', () => {
        const snapshot = buildSnapshot({
            checks: [
                buildCheck({ id: 'c1', checked: true }),
                buildCheck({ id: 'c2', checked: false }),
            ],
        });

        renderWithProviders(
            <SnapshotRoutineCard snapshot={snapshot} routineId="r-1" />,
        );

        // "1/2 Done" in the badge
        expect(screen.getByText(/1\/2/)).toBeInTheDocument();
        expect(screen.getByText(/Done/)).toBeInTheDocument();
    });

    it('shows 0% progress when there are no checks', () => {
        const snapshot = buildSnapshot({ checks: [] });

        renderWithProviders(
            <SnapshotRoutineCard snapshot={snapshot} routineId="r-1" />,
        );

        // The progress text should show "0%"
        const progressElements = screen.getAllByText(/0%/);
        expect(progressElements.length).toBeGreaterThan(0);
    });

    it('computes the correct completion percentage', () => {
        const snapshot = buildSnapshot({
            checks: [
                buildCheck({ id: 'c1', checked: true }),
                buildCheck({ id: 'c2', checked: true }),
                buildCheck({ id: 'c3', checked: false }),
                buildCheck({ id: 'c4', checked: false }),
            ],
        });

        renderWithProviders(
            <SnapshotRoutineCard snapshot={snapshot} routineId="r-1" />,
        );

        // 2/4 = 50%
        const percentElements = screen.getAllByText(/50%/);
        expect(percentElements.length).toBeGreaterThan(0);
    });

    it('shows the snapshot date', () => {
        renderWithProviders(
            <SnapshotRoutineCard snapshot={buildSnapshot()} routineId="r-1" />,
        );

        // The date is formatted by toLocaleDateString; check that some date text is present
        const dateEl = screen.getByText(new Date('2025-06-15').toLocaleDateString());
        expect(dateEl).toBeInTheDocument();
    });

    it('displays XP earned when checks have xp', () => {
        const snapshot = buildSnapshot({
            checks: [
                buildCheck({ id: 'c1', checked: true, xpGenerated: 30 }),
                buildCheck({ id: 'c2', checked: true, xpGenerated: 20 }),
            ],
        });

        renderWithProviders(
            <SnapshotRoutineCard snapshot={snapshot} routineId="r-1" />,
        );

        expect(screen.getByText(/\+50 XP/)).toBeInTheDocument();
    });

    it('shows "Completed" text when the snapshot is completed', () => {
        const snapshot = buildSnapshot({ completed: true });

        renderWithProviders(
            <SnapshotRoutineCard snapshot={snapshot} routineId="r-1" />,
        );

        expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('renders expand/collapse button', () => {
        renderWithProviders(
            <SnapshotRoutineCard snapshot={buildSnapshot()} routineId="r-1" />,
        );

        const expandButton = screen.getByRole('button', { name: /expand/i });
        expect(expandButton).toBeInTheDocument();
    });

    it('expands to show section details when clicking the expand button', () => {
        const snapshot = buildSnapshot();

        renderWithProviders(
            <SnapshotRoutineCard snapshot={snapshot} routineId="r-1" />,
        );

        // Items should not be visible before expanding
        expect(screen.queryByText('Drink water')).not.toBeInTheDocument();

        const expandButton = screen.getByRole('button', { name: /expand/i });
        fireEvent.click(expandButton);

        // After expanding, item names should be visible
        expect(screen.getByText('Drink water')).toBeInTheDocument();
    });

    it('shows section name when expanded', () => {
        renderWithProviders(
            <SnapshotRoutineCard snapshot={buildSnapshot()} routineId="r-1" />,
        );

        const expandButton = screen.getByRole('button', { name: /expand/i });
        fireEvent.click(expandButton);

        // The section name "Morning" appears in section header
        expect(screen.getByText('Morning')).toBeInTheDocument();
    });

    it('shows item type badges when expanded', () => {
        const snapshot = buildSnapshot({
            checks: [
                buildCheck({ id: 'c1', itemType: 'HABIT', itemName: 'Water' }),
                buildCheck({ id: 'c2', itemType: 'TASK', itemName: 'Read', sectionName: 'Morning' }),
            ],
            structure: {
                sections: [
                    buildSection({
                        items: [
                            {
                                type: 'HABIT',
                                groupId: 'group-1',
                                itemId: 'habit-1',
                                name: 'Water',
                                iconId: 'water',
                                startTime: '07:00',
                                endTime: '07:30',
                            },
                            {
                                type: 'TASK',
                                groupId: 'group-2',
                                itemId: 'task-1',
                                name: 'Read',
                                iconId: 'book',
                                startTime: '08:00',
                                endTime: '08:30',
                            },
                        ],
                    }),
                ],
            },
        });

        renderWithProviders(
            <SnapshotRoutineCard snapshot={snapshot} routineId="r-1" />,
        );

        const expandButton = screen.getByRole('button', { name: /expand/i });
        fireEvent.click(expandButton);

        expect(screen.getByText('Habit')).toBeInTheDocument();
        expect(screen.getByText('Task')).toBeInTheDocument();
    });

    it('displays a checkbox for each check item when expanded', () => {
        const snapshot = buildSnapshot({
            checks: [
                buildCheck({ id: 'c1', itemName: 'Item 1' }),
                buildCheck({ id: 'c2', itemName: 'Item 2' }),
            ],
        });

        renderWithProviders(
            <SnapshotRoutineCard snapshot={snapshot} routineId="r-1" />,
        );

        const expandButton = screen.getByRole('button', { name: /expand/i });
        fireEvent.click(expandButton);

        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes).toHaveLength(2);
    });

    it('shows checked state for completed items', () => {
        const snapshot = buildSnapshot({
            checks: [
                buildCheck({ id: 'c1', itemName: 'Done item', checked: true, xpGenerated: 10 }),
            ],
        });

        renderWithProviders(
            <SnapshotRoutineCard snapshot={snapshot} routineId="r-1" />,
        );

        const expandButton = screen.getByRole('button', { name: /expand/i });
        fireEvent.click(expandButton);

        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeChecked();
    });

    it('shows "Skipped" text for skipped items', () => {
        const snapshot = buildSnapshot({
            checks: [
                buildCheck({ id: 'c1', itemName: 'Skipped item', skipped: true }),
            ],
        });

        renderWithProviders(
            <SnapshotRoutineCard snapshot={snapshot} routineId="r-1" />,
        );

        const expandButton = screen.getByRole('button', { name: /expand/i });
        fireEvent.click(expandButton);

        expect(screen.getByText('Skipped')).toBeInTheDocument();
    });

    it('collapses sections when clicking the collapse button', () => {
        renderWithProviders(
            <SnapshotRoutineCard snapshot={buildSnapshot()} routineId="r-1" />,
        );

        // Expand first
        const expandButton = screen.getByRole('button', { name: /expand/i });
        fireEvent.click(expandButton);
        expect(screen.getByText('Drink water')).toBeInTheDocument();

        // Now collapse
        const collapseButton = screen.getByRole('button', { name: /collapse/i });
        fireEvent.click(collapseButton);
        expect(screen.queryByText('Drink water')).not.toBeInTheDocument();
    });
});
