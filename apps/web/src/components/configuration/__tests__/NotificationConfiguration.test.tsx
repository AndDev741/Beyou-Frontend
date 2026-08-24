import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/test-utils';
import NotificationConfiguration from '../NotificationConfiguration';

const getPreferences = vi.fn();
const updatePreferences = vi.fn();

vi.mock('@beyou/api/notification/notificationPreferences', () => ({
    getNotificationPreferences: () => getPreferences(),
    updateNotificationPreferences: (enabled: boolean) => updatePreferences(enabled),
}));

vi.mock('react-toastify', () => ({
    toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@beyou/api/apiError', () => ({
    getFriendlyErrorMessage: () => 'Something went wrong',
}));

const toggle = () => screen.getByTestId('engagement-email-toggle');

describe('NotificationConfiguration', () => {
    beforeEach(() => {
        getPreferences.mockReset();
        updatePreferences.mockReset();
    });

    it('shows the stored value once loaded', async () => {
        getPreferences.mockResolvedValue({ data: { engagementEmail: true } });

        renderWithProviders(<NotificationConfiguration />);

        await waitFor(() => expect(toggle()).toHaveAttribute('aria-checked', 'true'));
        expect(toggle()).toBeEnabled();
    });

    it('reflects an account that has opted out', async () => {
        getPreferences.mockResolvedValue({ data: { engagementEmail: false } });

        renderWithProviders(<NotificationConfiguration />);

        await waitFor(() => expect(toggle()).toHaveAttribute('aria-checked', 'false'));
    });

    it('sends the new value when flipped', async () => {
        getPreferences.mockResolvedValue({ data: { engagementEmail: true } });
        updatePreferences.mockResolvedValue({ data: { engagementEmail: false } });

        renderWithProviders(<NotificationConfiguration />);
        await waitFor(() => expect(toggle()).toBeEnabled());

        await userEvent.click(toggle());

        expect(updatePreferences).toHaveBeenCalledWith(false);
        await waitFor(() => expect(toggle()).toHaveAttribute('aria-checked', 'false'));
    });

    /**
     * The switch moves before the request answers, so a failure has to move it back.
     * Without this a failed save leaves the UI claiming an opt-out that the server never
     * recorded — and the next mail would then look like the switch is broken.
     */
    it('puts the switch back when the save fails', async () => {
        getPreferences.mockResolvedValue({ data: { engagementEmail: true } });
        updatePreferences.mockResolvedValue({ error: { errorKey: 'UnexpectedError' } });

        renderWithProviders(<NotificationConfiguration />);
        await waitFor(() => expect(toggle()).toBeEnabled());

        await userEvent.click(toggle());

        await waitFor(() => expect(toggle()).toHaveAttribute('aria-checked', 'true'));
    });

    /**
     * A preference nobody can read is not a preference anybody should be able to write:
     * a disabled switch cannot send a value derived from a failed load.
     */
    it('stays unavailable when the preference cannot be loaded', async () => {
        getPreferences.mockResolvedValue({ error: { errorKey: 'UnexpectedError' } });

        renderWithProviders(<NotificationConfiguration />);

        await waitFor(() => expect(toggle()).toBeDisabled());
        await userEvent.click(toggle());
        expect(updatePreferences).not.toHaveBeenCalled();
    });
});
