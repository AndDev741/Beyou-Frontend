/**
 * This Hermes build ships WITHOUT `Intl.PluralRules`. Without it i18next never
 * finds the `_one`/`_other` keys and falls back to the base key — which in
 * several of them is just the label, so "1 routine" read as "Routines" and
 * "3 sections" as "Sections".
 *
 * The app speaks two languages and both have a simple cardinal rule, so the
 * polyfill fits here instead of a new dependency:
 *
 * - en → `one` when n is exactly 1 (CLDR: i = 1 and v = 0)
 * - pt → `one` when n is 0 or 1 (CLDR: i = 0..1)
 *
 * Cardinal only. Nothing in the app uses ordinals ("1st"), and promising a
 * category we cannot compute would be worse than having no polyfill.
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

/** Installs the polyfill only when the runtime does not bring its own. */
export function installPluralRulesPolyfill(): void {
  const intl = globalThis.Intl as { PluralRules?: unknown } | undefined;
  if (!intl || typeof intl.PluralRules !== 'undefined') return;
  intl.PluralRules = MinimalPluralRules;
}
