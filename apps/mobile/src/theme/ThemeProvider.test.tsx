import { themeToVars } from './ThemeProvider';
import { defaultLight, themes } from '@beyou/theme';

describe('themeToVars', () => {
  it('maps a theme object to the 8 CSS variables', () => {
    const v = themeToVars(defaultLight);
    expect(v['--primary']).toBe(defaultLight.primary);
    expect(v['--background']).toBe(defaultLight.background);
    expect(v['--error']).toBe(defaultLight.error);
    expect(Object.keys(v)).toHaveLength(8);
  });
  it('produces distinct primary values across themes', () => {
    const primaries = new Set(themes.map((t) => themeToVars(t)['--primary']));
    expect(primaries.size).toBeGreaterThan(1);
  });
});
