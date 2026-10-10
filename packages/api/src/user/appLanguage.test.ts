import { describe, it, expect } from 'vitest';
import { appLanguageOrNull, shownLanguage } from './appLanguage';

describe('appLanguageOrNull', () => {
    it.each([
        ['pt', 'pt'],
        ['pt-BR', 'pt'],
        ['PT_br', 'pt'],
        ['en', 'en'],
        ['en-GB', 'en'],
        [' en-US ', 'en'],
    ])('maps %s to %s', (tag, expected) => {
        expect(appLanguageOrNull(tag)).toBe(expected);
    });

    it.each([undefined, null, '', '   ', 'fr', 'es-ES', 'portuguese'])('drops %s', (tag) => {
        expect(appLanguageOrNull(tag)).toBeNull();
    });
});

describe('shownLanguage', () => {
    it('prefers the resolved language, which is what the screen renders', () => {
        expect(shownLanguage({ resolvedLanguage: 'en', language: 'fr-FR' })).toBe('en');
    });

    it('falls back to the raw language', () => {
        expect(shownLanguage({ language: 'pt-BR' })).toBe('pt');
    });
});
