/**
 * O Hermes do build Android vem sem Intl.PluralRules, e sem ele o i18next cai
 * na chave base — "Rotinas" no lugar de "1 rotina". O polyfill cobre os dois
 * idiomas do app.
 */
import { installPluralRulesPolyfill } from '../src/lib/pluralRulesPolyfill';

const intl = globalThis.Intl as typeof Intl & { PluralRules?: unknown };
const real = intl.PluralRules;

afterEach(() => {
  intl.PluralRules = real;
});

it('leaves a runtime that already has PluralRules alone', () => {
  installPluralRulesPolyfill();
  expect(intl.PluralRules).toBe(real);
});

describe('with PluralRules missing (Hermes)', () => {
  beforeEach(() => {
    delete (intl as { PluralRules?: unknown }).PluralRules;
    installPluralRulesPolyfill();
  });

  it('installs a replacement', () => {
    expect(intl.PluralRules).toBeDefined();
  });

  it('uses one only for exactly 1 in English', () => {
    const rules = new intl.PluralRules('en');
    expect(rules.select(1)).toBe('one');
    expect(rules.select(0)).toBe('other');
    expect(rules.select(3)).toBe('other');
  });

  it('counts zero as one in Portuguese, as CLDR does', () => {
    const rules = new intl.PluralRules('pt-BR');
    expect(rules.select(0)).toBe('one');
    expect(rules.select(1)).toBe('one');
    expect(rules.select(2)).toBe('other');
  });

  it('reports the categories i18next asks for', () => {
    const rules = new intl.PluralRules('pt');
    expect(rules.resolvedOptions().pluralCategories).toEqual(['one', 'other']);
    expect(rules.resolvedOptions().type).toBe('cardinal');
  });
});
