/**
 * O Hermes deste build vem SEM `Intl.PluralRules`. Sem ele o i18next não acha
 * as chaves `_one`/`_other` e cai na chave base — que em várias delas é só o
 * rótulo, então "1 rotina" virava "Rotinas" e "3 seções" virava "Seções".
 *
 * O app fala dois idiomas e os dois têm regra cardinal simples, então o
 * polyfill cabe aqui em vez de uma dependência nova:
 *
 * - en → `one` quando n é exatamente 1 (CLDR: i = 1 and v = 0)
 * - pt → `one` quando n é 0 ou 1 (CLDR: i = 0..1)
 *
 * Só cardinal. Nada no app usa ordinal ("1º"), e prometer uma categoria que
 * não sabemos calcular seria pior que não ter o polyfill.
 */

type Category = 'one' | 'other';

const isOne = (locale: string, n: number): boolean => {
  const language = locale.toLowerCase().split('-')[0];
  if (language === 'pt') return n === 0 || n === 1;
  return n === 1;
};

class MinimalPluralRules {
  private readonly locale: string;

  constructor(locales?: string | string[], _options?: Intl.PluralRulesOptions) {
    this.locale = (Array.isArray(locales) ? locales[0] : locales) ?? 'en';
  }

  select(value: number): Category {
    return isOne(this.locale, value) ? 'one' : 'other';
  }

  resolvedOptions() {
    return {
      locale: this.locale,
      type: 'cardinal' as const,
      pluralCategories: ['one', 'other'],
      minimumIntegerDigits: 1,
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    };
  }

  static supportedLocalesOf(locales?: string | string[]): string[] {
    if (!locales) return [];
    return Array.isArray(locales) ? locales : [locales];
  }
}

/** Instala o polyfill só quando o runtime não traz o próprio. */
export function installPluralRulesPolyfill(): void {
  const intl = globalThis.Intl as { PluralRules?: unknown } | undefined;
  if (!intl || typeof intl.PluralRules !== 'undefined') return;
  intl.PluralRules = MinimalPluralRules;
}
