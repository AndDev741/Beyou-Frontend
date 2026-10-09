import { describe, expect, it } from 'vitest';
import { CODE_LANGUAGES, hasUnknownLanguage, normalizeCodeLanguage, withKnownLanguages } from '../codeLanguages';

describe('code block languages', () => {
    it("maps what people and models write to the picker's ids", () => {
        expect(normalizeCodeLanguage('Python')).toBe('python');
        expect(normalizeCodeLanguage('ts')).toBe('typescript');
        expect(normalizeCodeLanguage('c#')).toBe('csharp');
        expect(normalizeCodeLanguage('YML')).toBe('yaml');
        expect(normalizeCodeLanguage('brainfuck')).toBe('text');
        expect(normalizeCodeLanguage(undefined)).toBe('text');
    });

    it('says yes to any name, so BlockNote draws the block instead of throwing', () => {
        expect('brainfuck' in CODE_LANGUAGES).toBe(true);
        // The picker lists only the real entries.
        expect(Object.keys(CODE_LANGUAGES)).not.toContain('brainfuck');
        expect(Object.keys(CODE_LANGUAGES)).toContain('text');
    });

    it('moves every code block on a loaded page to a known id, nested ones included', () => {
        const blocks = [
            { type: 'paragraph', children: [{ type: 'codeBlock', props: { language: 'py' }, children: [] }] },
            { type: 'codeBlock', props: { language: 'cobolish' }, children: [] },
        ];
        expect(hasUnknownLanguage(blocks)).toBe(true);
        const fixed = withKnownLanguages(blocks);
        expect(fixed[0].children?.[0].props?.language).toBe('python');
        expect(fixed[1].props?.language).toBe('text');
        expect(hasUnknownLanguage(fixed)).toBe(false);
    });
});
