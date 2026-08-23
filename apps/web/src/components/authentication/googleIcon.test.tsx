import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('GoogleIcon — client ID guard', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('renders the Google login button when VITE_GOOGLE_CLIENT_ID is set', async () => {
        vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id-123');

        const { default: GoogleIcon } = await import('./googleIcon');
        const { container } = render(<GoogleIcon />);

        const button = container.querySelector('button');
        expect(button).not.toBeNull();

        // The label lives in the button's text now; the logo is decorative (empty
        // alt + aria-hidden), as the icon-plus-text pattern requires.
        expect(screen.getByRole('button', { name: 'ContinueWithGoogle' })).toBeDefined();
    });

    it('asks Google to show the account chooser', async () => {
        vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id-123');
        const href = vi.fn();
        // jsdom refuses an assignment to window.location.href, so intercept the setter.
        const original = Object.getOwnPropertyDescriptor(window, 'location');
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { set href(v: string) { href(v); }, get href() { return ''; } },
        });

        try {
            const { default: GoogleIcon } = await import('./googleIcon');
            render(<GoogleIcon />);
            screen.getByRole('button', { name: 'ContinueWithGoogle' }).click();

            // Without this parameter a browser holding one Google session never sees a
            // chooser: Google picks that account and the user cannot reach any other.
            expect(href).toHaveBeenCalledTimes(1);
            expect(href.mock.calls[0][0]).toContain('prompt=select_account');
        } finally {
            if (original) Object.defineProperty(window, 'location', original);
        }
    });

    it('returns null when VITE_GOOGLE_CLIENT_ID is empty string', async () => {
        vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');

        const { default: GoogleIcon } = await import('./googleIcon');
        const { container } = render(<GoogleIcon />);

        expect(container.innerHTML).toBe('');
    });

    it('returns null when VITE_GOOGLE_CLIENT_ID is undefined', async () => {
        // Delete the env var entirely so it resolves to undefined
        delete import.meta.env.VITE_GOOGLE_CLIENT_ID;

        const { default: GoogleIcon } = await import('./googleIcon');
        const { container } = render(<GoogleIcon />);

        expect(container.innerHTML).toBe('');
    });
});
