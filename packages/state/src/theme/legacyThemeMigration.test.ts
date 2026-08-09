import { describe, it, expect } from 'vitest';
import { LEGACY_MODE_MAP, parseThemePreference, resolveBase } from '@beyou/theme';

/**
 * Every theme name saved before the redesign has to land somewhere sane — an
 * account whose `themeInUse` no longer parses would show up themeless.
 *
 * Lives in @beyou/state because that package owns the vitest runner and already
 * aliases @beyou/theme; the map itself is `packages/theme/src/listOfThemes.ts`.
 */
describe('legacy theme migration', () => {
    /** The nine names the app shipped before the accent packs. */
    const cases: [legacy: string, mode: string, base: 'light' | 'dark', pack: string][] = [
        ['beYou', 'light:beyou', 'light', 'beyou'],
        ['beYouDark', 'dark:beyou', 'dark', 'beyou'],
        ['Sunset', 'light:sunset', 'light', 'sunset'],
        ['Amethyst', 'light:amethyst', 'light', 'amethyst'],
        ['Midnight', 'dark:beyou', 'dark', 'beyou'],
        ['Cyberpunk', 'dark:cyber', 'dark', 'cyber'],
        ['Mocha', 'light:sunset', 'light', 'sunset'],
        ['Polar', 'dark:beyou', 'dark', 'beyou'],
        ['Late Latte', 'dark:sunset', 'dark', 'sunset'],
    ];

    it.each(cases)('migrates %s to %s', (legacy, mode, base, pack) => {
        expect(LEGACY_MODE_MAP[legacy]).toBe(mode);

        const preference = parseThemePreference(legacy);
        expect(preference.accentPack).toBe(pack);
        expect(resolveBase(preference.mode, false)).toBe(base);
    });

    it('covers every name in the map, so a new entry cannot land untested', () => {
        expect(Object.keys(LEGACY_MODE_MAP).sort()).toEqual(cases.map(([name]) => name).sort());
    });

    /** Late Latte is a DARK theme despite the caramel accent — #2c1e1e background. */
    it('sends Late Latte to the dark base, not the light one', () => {
        expect(resolveBase(parseThemePreference('Late Latte').mode, false)).toBe('dark');
    });

    it('falls back to the default for a name the redesign dropped', () => {
        const preference = parseThemePreference('SomeThemeWeDeleted');

        expect(preference.mode).toBe('system');
        expect(preference.accentPack).toBe('beyou');
    });

    it('passes a new-style mode through untouched', () => {
        expect(parseThemePreference('dark:cyber')).toEqual({ mode: 'dark', accentPack: 'cyber' });
    });
});
