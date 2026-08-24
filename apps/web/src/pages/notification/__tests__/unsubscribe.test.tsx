import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render } from '@testing-library/react';
import Unsubscribe from '../unsubscribe';

const unsubscribeCall = vi.fn();

vi.mock('@beyou/api/notification/unsubscribe', () => ({
    default: (token: string) => unsubscribeCall(token),
}));

function renderAt(url: string) {
    return render(
        <MemoryRouter initialEntries={[url]}>
            <Routes>
                <Route path="/unsubscribe" element={<Unsubscribe />} />
            </Routes>
        </MemoryRouter>,
    );
}

describe('the unsubscribe page', () => {
    beforeEach(() => {
        unsubscribeCall.mockReset();
    });

    it('posts the token from the URL and confirms', async () => {
        unsubscribeCall.mockResolvedValue({ success: true });

        renderAt('/unsubscribe?token=a-real-token');

        await waitFor(() => expect(screen.getByTestId('unsubscribe-success')).toBeInTheDocument());
        expect(unsubscribeCall).toHaveBeenCalledWith('a-real-token');
    });

    /**
     * The page acts on mount, so it is the one thing standing between a mail client's
     * link prefetch and an unwanted unsubscribe — a prefetch fetches HTML and does not
     * run scripts. That protection is worth nothing if the page also acts with no token,
     * which is what a prefetch of a mangled link looks like.
     */
    it('does not call anything without a token', async () => {
        renderAt('/unsubscribe');

        await waitFor(() => expect(screen.getByTestId('unsubscribe-error')).toBeInTheDocument());
        expect(unsubscribeCall).not.toHaveBeenCalled();
    });

    it('says so when the token matches nothing', async () => {
        unsubscribeCall.mockResolvedValue({ error: { errorKey: 'INVALID_REQUEST' } });

        renderAt('/unsubscribe?token=stale');

        await waitFor(() => expect(screen.getByTestId('unsubscribe-error')).toBeInTheDocument());
    });

    /**
     * StrictMode mounts effects twice in development. The endpoint is idempotent so a
     * second call is harmless, but it would double the rate-limit spend against a bucket
     * sized for one click.
     */
    it('acts once even if mounted twice', async () => {
        unsubscribeCall.mockResolvedValue({ success: true });

        const { unmount } = renderAt('/unsubscribe?token=a-real-token');
        await waitFor(() => expect(unsubscribeCall).toHaveBeenCalledTimes(1));
        unmount();

        expect(unsubscribeCall).toHaveBeenCalledTimes(1);
    });
});
