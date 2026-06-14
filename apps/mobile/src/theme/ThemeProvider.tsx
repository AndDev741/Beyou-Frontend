import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { vars } from 'nativewind';
import { themes, defaultLight, type Theme } from '@beyou/theme';

export function themeToVars(theme: Theme): Record<string, string> {
  return {
    '--background': theme.background,
    '--primary': theme.primary,
    '--secondary': theme.secondary,
    '--description': theme.description,
    '--icon': theme.icon,
    '--placeholder': theme.placeholder,
    '--success': theme.success,
    '--error': theme.error,
  };
}

interface ThemeCtx {
  theme: Theme;
  setThemeByMode: (mode: string) => void;
}

const Ctx = createContext<ThemeCtx>({ theme: defaultLight, setThemeByMode: () => {} });

export const useBeyouTheme = () => useContext(Ctx);

export function BeyouThemeProvider({
  children,
  initialMode,
}: {
  children: ReactNode;
  initialMode?: string;
}) {
  const [theme, setTheme] = useState<Theme>(
    () => themes.find((t) => t.mode === initialMode) ?? defaultLight,
  );

  const setThemeByMode = (mode: string) =>
    setTheme(themes.find((t) => t.mode === mode) ?? defaultLight);

  const style = useMemo(() => vars(themeToVars(theme)), [theme]);

  return (
    <Ctx.Provider value={{ theme, setThemeByMode }}>
      <View style={[{ flex: 1 }, style]}>{children}</View>
    </Ctx.Provider>
  );
}
