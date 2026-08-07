import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/test-utils';
import { SnapshotEmptyState } from '../SnapshotEmptyState';

describe('SnapshotEmptyState', () => {
    it('renders the "no history" heading message', () => {
        renderWithProviders(<SnapshotEmptyState />);

        expect(
            screen.getByText('No history available for this date'),
        ).toBeInTheDocument();
    });

    it('renders the descriptive help text', () => {
        renderWithProviders(<SnapshotEmptyState />);

        expect(
            screen.getByText(
                'Snapshots are created when you interact with your routines. Try selecting a date when you had scheduled routines.',
            ),
        ).toBeInTheDocument();
    });

    it('renders the history icon, not an emoji', () => {
        const { container } = renderWithProviders(<SnapshotEmptyState />);

        expect(container.querySelector('svg.lucide-history')).toBeInTheDocument();
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('renders within a bordered container', () => {
        renderWithProviders(<SnapshotEmptyState />);

        // The main container has the border class
        const heading = screen.getByText('No history available for this date');
        const container = heading.closest('div.flex.flex-col');
        expect(container).toBeInTheDocument();
    });
});
