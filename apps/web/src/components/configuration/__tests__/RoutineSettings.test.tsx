import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { renderWithProviders } from '../../../test/test-utils';
import rootReducer from '@beyou/state/rootReducer';
import RoutineSettings from '../RoutineSettings';

// Mock editUser service to prevent real HTTP calls
vi.mock('@beyou/api/user/editUser', () => ({
    default: vi.fn(() => Promise.resolve({ data: {} })),
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

const baseState = rootReducer(undefined as any, { type: '@@INIT' } as any);

const createStore = (overrides: Record<string, any> = {}) =>
    configureStore({
        reducer: rootReducer,
        preloadedState: {
            ...baseState,
            perfil: {
                ...baseState.perfil,
                timezone: 'UTC',
                xpDecayStrategy: 'GRADUAL' as const,
                ...overrides,
            },
        },
    });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RoutineSettings', () => {
    it('renders the settings title', () => {
        renderWithProviders(<RoutineSettings />, {
            storeOverride: createStore(),
        });

        expect(screen.getByText('RoutineSettingsTitle')).toBeInTheDocument();
    });

    it('renders the settings description', () => {
        renderWithProviders(<RoutineSettings />, {
            storeOverride: createStore(),
        });

        expect(screen.getByText('RoutineSettingsDescription')).toBeInTheDocument();
    });

    // -----------------------------------------------------------------------
    // Timezone selector
    // -----------------------------------------------------------------------
    describe('timezone selector', () => {
        it('renders the timezone label', () => {
            renderWithProviders(<RoutineSettings />, {
                storeOverride: createStore(),
            });

            expect(screen.getByText('TimezoneLabel')).toBeInTheDocument();
        });

        it('shows the current timezone as selected', () => {
            renderWithProviders(<RoutineSettings />, {
                storeOverride: createStore({ timezone: 'America/New_York' }),
            });

            const timezoneButton = screen.getByRole('button', { name: 'TimezoneLabel' });
            expect(timezoneButton).toHaveTextContent('America/New_York');
        });

        it('opens the timezone dropdown when clicking the selector', () => {
            renderWithProviders(<RoutineSettings />, {
                storeOverride: createStore(),
            });

            const timezoneButton = screen.getByRole('button', { name: 'TimezoneLabel' });
            fireEvent.click(timezoneButton);

            expect(screen.getByRole('listbox')).toBeInTheDocument();
        });

        it('shows timezone options in the dropdown', () => {
            renderWithProviders(<RoutineSettings />, {
                storeOverride: createStore(),
            });

            const timezoneButton = screen.getByRole('button', { name: 'TimezoneLabel' });
            fireEvent.click(timezoneButton);

            expect(screen.getByRole('option', { name: 'America/New_York' })).toBeInTheDocument();
            expect(screen.getByRole('option', { name: 'Europe/London' })).toBeInTheDocument();
            expect(screen.getByRole('option', { name: 'Asia/Tokyo' })).toBeInTheDocument();
        });

        it('selects a timezone when clicking an option', () => {
            renderWithProviders(<RoutineSettings />, {
                storeOverride: createStore(),
            });

            const timezoneButton = screen.getByRole('button', { name: 'TimezoneLabel' });
            fireEvent.click(timezoneButton);

            const option = screen.getByRole('option', { name: 'America/Sao_Paulo' });
            fireEvent.click(option);

            // After selection, the button shows the new timezone
            expect(timezoneButton).toHaveTextContent('America/Sao_Paulo');
        });

        it('filters timezones as the user types in the search box', () => {
            renderWithProviders(<RoutineSettings />, {
                storeOverride: createStore(),
            });

            const timezoneButton = screen.getByRole('button', { name: 'TimezoneLabel' });
            fireEvent.click(timezoneButton);

            const searchInput = screen.getByPlaceholderText('TimezoneSearchPlaceholder');
            fireEvent.change(searchInput, { target: { value: 'Tokyo' } });

            const options = screen.getAllByRole('option');
            expect(options).toHaveLength(1);
            expect(options[0]).toHaveTextContent('Asia/Tokyo');
        });

        it('shows "No timezones found" when search has no matches', () => {
            renderWithProviders(<RoutineSettings />, {
                storeOverride: createStore(),
            });

            const timezoneButton = screen.getByRole('button', { name: 'TimezoneLabel' });
            fireEvent.click(timezoneButton);

            const searchInput = screen.getByPlaceholderText('TimezoneSearchPlaceholder');
            fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } });

            expect(screen.getByText('No timezones found')).toBeInTheDocument();
        });
    });

    // -----------------------------------------------------------------------
    // XP Decay strategy cards
    // -----------------------------------------------------------------------
    describe('XP decay strategy', () => {
        it('renders the XP decay label', () => {
            renderWithProviders(<RoutineSettings />, {
                storeOverride: createStore(),
            });

            expect(screen.getByText('XpDecayLabel')).toBeInTheDocument();
        });

        it('renders all three strategy option cards', () => {
            renderWithProviders(<RoutineSettings />, {
                storeOverride: createStore(),
            });

            expect(screen.getByText('Gradual')).toBeInTheDocument();
            expect(screen.getByText('Flat')).toBeInTheDocument();
            expect(screen.getByText('Time Window')).toBeInTheDocument();
        });

        it('renders descriptions for each strategy', () => {
            renderWithProviders(<RoutineSettings />, {
                storeOverride: createStore(),
            });

            expect(screen.getByText('Gradual description')).toBeInTheDocument();
            expect(screen.getByText('Flat description')).toBeInTheDocument();
            expect(screen.getByText('Time Window description')).toBeInTheDocument();
        });

        it('highlights the currently selected strategy as pressed', () => {
            renderWithProviders(<RoutineSettings />, {
                storeOverride: createStore({ xpDecayStrategy: 'GRADUAL' }),
            });

            const gradualBtn = screen.getByRole('button', { name: /Gradual/i });
            expect(gradualBtn).toHaveAttribute('aria-pressed', 'true');

            const flatBtn = screen.getByRole('button', { name: /Flat/i });
            expect(flatBtn).toHaveAttribute('aria-pressed', 'false');
        });

        it('changes the active strategy when clicking a different card', () => {
            renderWithProviders(<RoutineSettings />, {
                storeOverride: createStore({ xpDecayStrategy: 'GRADUAL' }),
            });

            const flatBtn = screen.getByRole('button', { name: /Flat/i });
            fireEvent.click(flatBtn);

            expect(flatBtn).toHaveAttribute('aria-pressed', 'true');

            const gradualBtn = screen.getByRole('button', { name: /Gradual/i });
            expect(gradualBtn).toHaveAttribute('aria-pressed', 'false');
        });
    });

    // -----------------------------------------------------------------------
    // Automatic saving
    // -----------------------------------------------------------------------
    describe('auto save', () => {
        it('has no save button: each choice persists on its own', () => {
            renderWithProviders(<RoutineSettings />, {
                storeOverride: createStore(),
            });

            expect(screen.queryByRole('button', { name: /^Save$/i })).toBeNull();
        });

        it('persists the strategy as soon as it is picked', async () => {
            const editUser = (await import('@beyou/api/user/editUser')).default;
            renderWithProviders(<RoutineSettings />, {
                storeOverride: createStore({ xpDecayStrategy: 'GRADUAL' }),
            });

            fireEvent.click(screen.getByRole('button', { name: /Flat/i }));

            expect(editUser).toHaveBeenCalledWith(
                expect.objectContaining({ xpDecayStrategy: 'FLAT' })
            );
        });
    });
});
