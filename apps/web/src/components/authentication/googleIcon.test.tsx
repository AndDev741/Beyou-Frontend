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

        // O rótulo agora está no texto do botão; o logo é decorativo
        // (alt vazio + aria-hidden), como manda o padrão de ícone + texto.
        expect(screen.getByRole('button', { name: 'ContinueWithGoogle' })).toBeDefined();
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
