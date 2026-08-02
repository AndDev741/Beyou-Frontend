import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { View, useColorScheme } from 'react-native';
import { vars } from 'nativewind';
import {
  buildTheme,
  parseThemePreference,
  themeToVars,
  type Theme,
  type ThemePreference,
} from '@beyou/theme';

/** Reexportado por compatibilidade: a fonte do mapa agora é packages/theme. */
export { themeToVars };

interface ThemeCtx {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
  /** Aceita a string persistida (formato novo ou modo legado). */
  setThemeByMode: (mode: string) => void;
}

const fallbackPreference: ThemePreference = { mode: 'system', accentPack: 'beyou' };

const Ctx = createContext<ThemeCtx>({
  theme: buildTheme(fallbackPreference),
  preference: fallbackPreference,
  setPreference: () => {},
  setThemeByMode: () => {},
});

export const useBeyouTheme = () => useContext(Ctx);

export function BeyouThemeProvider({
  children,
  initialMode,
}: {
  children: ReactNode;
  initialMode?: string;
}) {
  const [preference, setPreference] = useState<ThemePreference>(() =>
    parseThemePreference(initialMode),
  );
  // `system` segue o SO em tempo real — o usuário pode trocar sem sair do app.
  const prefersDark = useColorScheme() === 'dark';

  const theme = useMemo(() => buildTheme(preference, prefersDark), [preference, prefersDark]);
  const style = useMemo(() => vars(themeToVars(theme)), [theme]);

  const value = useMemo<ThemeCtx>(
    () => ({
      theme,
      preference,
      setPreference,
      setThemeByMode: (mode: string) => setPreference(parseThemePreference(mode)),
    }),
    [theme, preference],
  );

  return (
    <Ctx.Provider value={value}>
      <View style={[{ flex: 1 }, style]}>{children}</View>
    </Ctx.Provider>
  );
}
