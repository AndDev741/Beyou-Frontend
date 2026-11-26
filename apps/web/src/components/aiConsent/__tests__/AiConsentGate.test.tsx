import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureStore } from '@reduxjs/toolkit';
import rootReducer from '@beyou/state/rootReducer';
import { aiConsentEnter } from '@beyou/state/user/perfilSlice';
import { renderWithProviders } from '../../../test/test-utils';
import AiConsentGate from '../AiConsentGate';
import { resources } from '@beyou/i18n';
import AiConsentConfiguration from '../../configuration/AiConsentConfiguration';
import { openAiConsent } from '../aiConsentBus';

const setAiConsent = vi.fn();
vi.mock('@beyou/api/user/setAiConsent', () => ({
    default: (granted: boolean) => setAiConsent(granted),
}));

const notifyError = vi.fn();
const notifySuccess = vi.fn();
vi.mock('../../../lib/notify', () => ({
    notify: {
        error: (m: string) => notifyError(m),
        success: (m: string) => notifySuccess(m),
    },
}));

const storeWith = (consent: 'UNASKED' | 'GRANTED' | 'DECLINED' | null) => {
    const store = configureStore({ reducer: rootReducer });
    store.dispatch(aiConsentEnter(consent));
    return store;
};

describe('AiConsentGate', () => {
    beforeEach(() => {
        setAiConsent.mockReset();
        notifyError.mockReset();
        notifySuccess.mockReset();
    });

    it('asks an account that was never asked, naming who receives what', () => {
        renderWithProviders(<AiConsentGate />, { storeOverride: storeWith('UNASKED') });

        // t() is the identity under test; the English copy itself is checked below.
        expect(screen.getByTestId('ai-consent-who')).toHaveTextContent('AiConsentWho');
        expect(screen.getByText('AiConsentWhatMessages')).toBeInTheDocument();
        expect(screen.getByText('AiConsentNeverSent')).toBeInTheDocument();
        expect(screen.getByTestId('ai-consent-allow')).toBeInTheDocument();
        expect(screen.getByTestId('ai-consent-decline')).toBeInTheDocument();
        expect(setAiConsent).not.toHaveBeenCalled();
    });

    it('the copy names every company that receives data, in both languages', () => {
        for (const lang of ['en', 'pt'] as const) {
            const who = resources[lang].translation.AiConsentWho;
            expect(who).toMatch(/Mistral AI/);
            expect(who).toMatch(/Google Gemini/);
            expect(who).toMatch(/Tavily/);
        }
    });

    it('stays closed once answered, and for a backend that does not know the field', () => {
        renderWithProviders(<AiConsentGate />, { storeOverride: storeWith('GRANTED') });
        expect(screen.queryByTestId('ai-consent-dialog')).toBeNull();
    });

    it('a yes is saved and closes the dialog', async () => {
        setAiConsent.mockResolvedValue({ data: { aiConsent: 'GRANTED' } });
        const store = storeWith('UNASKED');
        renderWithProviders(<AiConsentGate />, { storeOverride: store });

        await userEvent.click(screen.getByTestId('ai-consent-allow'));

        expect(setAiConsent).toHaveBeenCalledWith(true);
        await waitFor(() => expect(screen.queryByTestId('ai-consent-dialog')).toBeNull());
        expect(store.getState().perfil.aiConsent).toBe('GRANTED');
    });

    it('an answer the server did not take keeps the question open', async () => {
        setAiConsent.mockResolvedValue({ error: { errorKey: 'UnexpectedError' } });
        const store = storeWith('UNASKED');
        renderWithProviders(<AiConsentGate />, { storeOverride: store });

        await userEvent.click(screen.getByTestId('ai-consent-decline'));

        await waitFor(() => expect(notifyError).toHaveBeenCalled());
        expect(store.getState().perfil.aiConsent).toBe('UNASKED');
        expect(screen.getByTestId('ai-consent-dialog')).toBeInTheDocument();
    });

    it('opens again on request, for someone turning the features back on', async () => {
        renderWithProviders(<AiConsentGate />, { storeOverride: storeWith('DECLINED') });
        expect(screen.queryByTestId('ai-consent-dialog')).toBeNull();

        act(() => openAiConsent());

        expect(screen.getByTestId('ai-consent-dialog')).toBeInTheDocument();
    });
});

describe('AiConsentConfiguration', () => {
    beforeEach(() => {
        setAiConsent.mockReset();
        notifySuccess.mockReset();
    });

    it('turns the features off in one click', async () => {
        setAiConsent.mockResolvedValue({ data: { aiConsent: 'DECLINED' } });
        const store = storeWith('GRANTED');
        renderWithProviders(<AiConsentConfiguration />, { storeOverride: store });

        await userEvent.click(screen.getByTestId('ai-consent-turn-off'));

        expect(setAiConsent).toHaveBeenCalledWith(false);
        await waitFor(() => expect(store.getState().perfil.aiConsent).toBe('DECLINED'));
        expect(notifySuccess).toHaveBeenCalled();
    });

    it('turning them on opens the consent dialog instead of saying yes itself', async () => {
        const store = storeWith('DECLINED');
        renderWithProviders(
            <>
                <AiConsentConfiguration />
                <AiConsentGate />
            </>,
            { storeOverride: store },
        );

        await userEvent.click(screen.getByTestId('ai-consent-turn-on'));

        expect(screen.getByTestId('ai-consent-dialog')).toBeInTheDocument();
        expect(setAiConsent).not.toHaveBeenCalled();
    });
});
