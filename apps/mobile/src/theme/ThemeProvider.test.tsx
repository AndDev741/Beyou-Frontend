import { themeToVars } from './ThemeProvider';
import { buildTheme, defaultLight, themeFromStoredMode, themes } from '@beyou/theme';

describe('themeToVars', () => {
  it('maps a theme to the redesign tokens', () => {
    const v = themeToVars(defaultLight);
    expect(v['--accent']).toBe(defaultLight.accent);
    expect(v['--surface']).toBe(defaultLight.surface);
    expect(v['--bg']).toBe(defaultLight.bg);
    expect(v['--text']).toBe(defaultLight.text);
    expect(v['--danger']).toBe(defaultLight.danger);
  });

  it('keeps emitting the legacy aliases while components migrate', () => {
    const v = themeToVars(defaultLight);
    // `background` aponta para a SUPERFÍCIE (cartão), não para o fundo da página.
    expect(v['--background']).toBe(defaultLight.surface);
    expect(v['--primary']).toBe(defaultLight.accent);
    expect(v['--secondary']).toBe(defaultLight.text);
    expect(v['--error']).toBe(defaultLight.danger);
  });

  it('produces distinct accents across packs', () => {
    const accents = new Set(themes.map((t) => themeToVars(t)['--accent']));
    expect(accents.size).toBeGreaterThan(1);
  });

  it('keeps neutrals stable when only the accent pack changes', () => {
    const beyou = themeToVars(buildTheme({ mode: 'light', accentPack: 'beyou' }));
    const cyber = themeToVars(buildTheme({ mode: 'light', accentPack: 'cyber' }));
    expect(cyber['--surface']).toBe(beyou['--surface']);
    expect(cyber['--text']).toBe(beyou['--text']);
    expect(cyber['--accent']).not.toBe(beyou['--accent']);
  });

  it('migrates a legacy saved mode instead of dropping the theme', () => {
    const lateLatte = themeFromStoredMode('Late Latte');
    // Late Latte era um tema ESCURO (fundo #2c1e1e) com acento caramelo.
    expect(lateLatte.base).toBe('dark');
    expect(lateLatte.accentPack).toBe('sunset');
  });
});
