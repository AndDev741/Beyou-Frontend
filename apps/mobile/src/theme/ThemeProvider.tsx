import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { View, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { vars } from 'nativewind';
import {
  buildTheme,
  parseThemePreference,
  themeToVars,
  type Theme,
  type ThemePreference,
} from '@beyou/theme';

/** Re-exported for compatibility: the map's source is packages/theme now. */
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
  // `system` follows the OS live — the user can switch without leaving the app.
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
      {/* The status bar follows the resolved base. Nothing styled it before, so
          on a light theme the clock, wifi and battery stayed white on #F5F7FA —
          invisible. It lives here because this is where the base is known. */}
      <StatusBar style={theme.base === 'dark' ? 'light' : 'dark'} />
      <View style={[{ flex: 1 }, style]}>{children}</View>
    </Ctx.Provider>
  );
}
