import { describe, it, expect } from 'vitest';
import i18next from 'i18next';
import { getFriendlyErrorMessage } from './apiError';

async function translator() {
    const instance = i18next.createInstance();
    await instance.init({
        lng: 'en',
        resources: {
            en: {
                translation: {
                    UnexpectedError: 'Something went wrong',
                    GOAL_NOT_OWNED: "This goal doesn't belong to your account.",
                },
            },
        },
    });
    return instance.t;
}

describe('getFriendlyErrorMessage', () => {
    it('translates a key the locale carries', async () => {
        const t = await translator();
        expect(getFriendlyErrorMessage(t, { errorKey: 'GOAL_NOT_OWNED' }))
            .toBe("This goal doesn't belong to your account.");
    });

    it('shows the generic message for a key nobody translated, never the raw key', async () => {
        const t = await translator();
        expect(getFriendlyErrorMessage(t, { errorKey: 'SOME_NEW_BACKEND_KEY' })).toBe('Something went wrong');
    });

    it('shows the generic message when there is no error at all', async () => {
        const t = await translator();
        expect(getFriendlyErrorMessage(t)).toBe('Something went wrong');
    });
});
