import { describe, expect, it } from 'vitest';
import { searchIcons, getIconCategories, getIconCategoryLabel } from '../search';
import { getAllEntries, ICON_CATEGORIES } from '../registry';
import { getExtraIconNode, getExtraIconNames } from '../extraNodes';
import curated from '../data/curated.json';
import emojiCharMap from '../data/emojiCharMap.json';
import lucideNames from '../data/lucideNames.json';

const ids = (query: string, locale = 'pt', limit = 8) =>
  searchIcons({ query, locale, limit }).map((e) => e.id);

describe('Portuguese search', () => {
  // Before the curated vocabulary existed, Portuguese search was 17 working words
  // (`keywordsById` was empty and half the alias keys were unreachable). Every word
  // below returned nothing at all.
  const EVERYDAY_PT = [
    'bíblia', 'cruz', 'igreja', 'oração', 'rezar', 'fé',
    'água', 'correr', 'dormir', 'dinheiro', 'academia', 'treino',
    'cachorro', 'gato', 'árvore', 'flor', 'telefone', 'computador',
    'café', 'cerveja', 'chuva', 'neve', 'relógio', 'calendário',
    'lápis', 'caneta', 'escola', 'médico', 'remédio', 'bicicleta',
    'ônibus', 'trem', 'chave', 'porta', 'cama', 'banho', 'dente',
    'limpar', 'cozinhar', 'compras', 'jogo', 'filme', 'foto', 'lixo',
    'planta', 'praia', 'montanha', 'leitura', 'escrever', 'alongamento',
  ];

  it.each(EVERYDAY_PT)('finds something for "%s"', (query) => {
    expect(ids(query)).not.toHaveLength(0);
  });

  it('accepts a query with or without accents', () => {
    expect(ids('bíblia')).toEqual(ids('biblia'));
    expect(ids('oração')).toEqual(ids('oracao'));
  });
});

describe('the reported gap: faith icons', () => {
  it('"cruz" leads with the cross', () => {
    expect(ids('cruz')[0]).toBe('lucide:cross');
    expect(ids('cruz')).toContain('emoji:latin_cross');
  });

  it('"igreja" leads with the church', () => {
    expect(ids('igreja')[0]).toBe('lucide:church');
  });

  // No bible glyph exists in lucide or in the emoji set, so the marked book and the
  // closed book stand in for it. The point of the test is that "bíblia" answers at
  // all — it returned nothing in either language before.
  it('"bíblia" answers with a book, and so does "bible"', () => {
    const pt = ids('bíblia');
    expect(pt.some((id) => ['lucide:book-marked', 'emoji:closed_book', 'emoji:book'].includes(id)))
      .toBe(true);
    expect(searchIcons({ query: 'bible', locale: 'en', limit: 8 }).length).toBeGreaterThan(0);
  });

  it('"oração" and "rezar" lead with praying hands', () => {
    expect(ids('oração')[0]).toBe('emoji:pray');
    expect(ids('rezar')[0]).toBe('emoji:pray');
  });

  it('covers the faiths beyond the one that was reported', () => {
    expect(ids('judaísmo')).toContain('emoji:star_of_david');
    expect(ids('islã')).toContain('emoji:star_and_crescent');
    expect(ids('budismo')).toContain('emoji:wheel_of_dharma');
  });
});

describe('search precision', () => {
  // "bolo" (cake) sits inside "simbolo", a Portuguese keyword of the old catch-all
  // `icons` category that EVERY entry carried — so it used to match all 3657 entries
  // and return the alphabetical head: a-arrow-down, a-arrow-up, a-large-small.
  it('a query inside an unrelated word matches nothing', () => {
    const hits = searchIcons({ query: 'bolo', locale: 'pt', limit: 500 });
    expect(hits.length).toBeLessThan(10);
    expect(hits[0].id).toBe('lucide:cake');
  });

  it('meta words no longer return the whole catalog', () => {
    for (const query of ['icone', 'simbolo']) {
      expect(searchIcons({ query, locale: 'pt', limit: 500 }).length).toBeLessThan(50);
    }
  });

  it('an icon named for the query beats one merely containing the word', () => {
    // "house" is one word of "derelict house building"; only one icon IS a house.
    expect(searchIcons({ query: 'house', locale: 'en', limit: 5 })[0].id).toBe('lucide:house');
  });

  it('an exact keyword beats its category and beats a prefix', () => {
    // "academia" is both a fitness category keyword and the dumbbell's own word.
    expect(ids('academia')[0]).toBe('lucide:dumbbell');
    // "peso" is the weight's own word; philippine-peso only contains it.
    expect(ids('peso')[0]).toBe('lucide:weight');
  });

  it('matches emoji by their alternative names', () => {
    // The generator kept only the primary short_name, so "thumbsup" found nothing —
    // the emoji's primary name is "+1".
    expect(searchIcons({ query: 'thumbsup', locale: 'en', limit: 3 }).map((e) => e.id))
      .toContain('emoji:+1');
  });
});

describe('taxonomy', () => {
  it('browses by domain, not just by icon-vs-emoji', () => {
    expect(getIconCategories()).toEqual([...ICON_CATEGORIES]);
    const faith = searchIcons({ query: '', category: 'faith', limit: 100 });
    expect(faith.length).toBeGreaterThan(10);
    expect(faith.map((e) => e.id)).toContain('lucide:church');
  });

  it('keeps the icon/emoji type filters working', () => {
    expect(searchIcons({ query: '', category: 'icons', limit: 5 }).every((e) => e.type === 'lucide'))
      .toBe(true);
    expect(searchIcons({ query: '', category: 'emoji', limit: 5 }).every((e) => e.type === 'emoji'))
      .toBe(true);
  });

  it('labels every category in both languages', () => {
    for (const category of [...ICON_CATEGORIES, 'icons', 'emoji']) {
      for (const locale of ['en', 'pt']) {
        expect(getIconCategoryLabel(category, locale)).not.toBe(category);
      }
    }
  });

  it('pulls emoji into domain categories from the dataset', () => {
    const food = searchIcons({ query: '', category: 'food', limit: 500 });
    expect(food.some((e) => e.type === 'emoji')).toBe(true);
  });
});

describe('curated data integrity', () => {
  const entries = Object.entries(curated as Record<string, { c: string[]; en: string[]; pt: string[] }>);

  it('every curated id exists in the registry', () => {
    const known = new Set(getAllEntries().map((e) => e.id));
    expect(entries.filter(([id]) => !known.has(id)).map(([id]) => id)).toEqual([]);
  });

  it('every curated entry carries both languages and a known category', () => {
    const known = new Set<string>(ICON_CATEGORIES);
    for (const [id, value] of entries) {
      expect(value.en.length, `${id} en`).toBeGreaterThan(0);
      expect(value.pt.length, `${id} pt`).toBeGreaterThan(0);
      expect(value.c.length, `${id} categories`).toBeGreaterThan(0);
      expect(value.c.filter((c) => !known.has(c)), `${id} unknown category`).toEqual([]);
    }
  });
});

describe('generated data', () => {
  it('drops the barrel file that used to masquerade as an icon', () => {
    // readdirSync swept up `index.js`, giving the picker a `lucide:index` tile that
    // rendered nothing on either platform.
    expect(lucideNames as string[]).not.toContain('index');
    expect(getAllEntries().map((e) => e.id)).not.toContain('lucide:index');
  });

  it('carries path data for the brand marks lucide-react-native dropped', () => {
    const names = getExtraIconNames();
    expect(names).toContain('github');
    expect(names.every((n) => (lucideNames as string[]).includes(n))).toBe(true);
    const node = getExtraIconNode('github');
    expect(Array.isArray(node)).toBe(true);
    expect(node![0][0]).toBe('path');
    expect(getExtraIconNode('house')).toBeUndefined();
  });

  it('never re-points an emoji id at a different character', () => {
    // Saved icons are `emoji:<short_name>`; regenerating must stay additive.
    const map = emojiCharMap as Record<string, string>;
    expect(map['latin_cross']).toBe('✝️');
    expect(map['pray']).toBe('🙏');
    expect(map['fire']).toBe('🔥');
  });
});
