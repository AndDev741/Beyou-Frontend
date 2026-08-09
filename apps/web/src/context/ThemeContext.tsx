import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react"
import {
    buildTheme,
    defaultLight,
    parseThemePreference,
    themeToVars,
    type Theme,
    type ThemePreference,
} from "@beyou/theme";
import { useSelector } from "react-redux";
import { RootState } from "@beyou/state/rootReducer";
import { logger } from "../utils/logger";

export type ThemeType = Theme;
type ThemeContextType = {
    theme: ThemeType;
    /** Preferência crua (modo + pack), antes de resolver `system`. */
    preference: ThemePreference;
    setPreference: (next: ThemePreference) => void;
    /** @deprecated aplica um tema já resolvido; prefira `setPreference`. */
    setTheme: (next: ThemeType) => void;
};

const ThemeContext = createContext<ThemeContextType>({
    theme: defaultLight,
    preference: { mode: "system", accentPack: "beyou" },
    setPreference: () => { },
    setTheme: () => { },
});

// A theme picked on the login page is saved here (NOT via redux-persist, where
// `perfil` is blacklisted as PII). It acts as the fallback below the logged-in
// account theme, so a choice made before signing up carries into the account
// when that account has no theme of its own.
const THEME_STORAGE_KEY = "beyou-theme";

const prefersDarkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

function readStoredPreference(): ThemePreference | null {
    try {
        const raw = localStorage.getItem(THEME_STORAGE_KEY);
        if (!raw) return null;
        // Formato atual: a string da preferência ("system:beyou"). Instalações
        // antigas guardaram o objeto Theme inteiro — aproveitamos o `mode` dele,
        // que o parse migra dos nomes legados ("Cyberpunk", "Late Latte", ...).
        if (raw.startsWith("{")) {
            const parsed = JSON.parse(raw) as { mode?: string };
            return parsed.mode ? parseThemePreference(parsed.mode) : null;
        }
        return parseThemePreference(raw);
    } catch {
        return null;
    }
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const userTheme = useSelector((state: RootState) => state.perfil.themeInUse);
    const [preference, setPreference] = useState<ThemePreference>(
        () => readStoredPreference() ?? parseThemePreference(userTheme?.mode),
    );
    // `system` acompanha o SO em tempo real: quem troca o tema do sistema com o
    // app aberto vê a mudança sem recarregar.
    const [prefersDark, setPrefersDark] = useState(() => prefersDarkQuery().matches);

    useEffect(() => {
        const query = prefersDarkQuery();
        const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
        query.addEventListener?.("change", onChange);
        return () => query.removeEventListener?.("change", onChange);
    }, []);

    // A preferência da conta vence assim que o perfil carrega. Quando ela não
    // existe, mantemos a escolha local (feita na tela de login) em vez de
    // resetar para o padrão do SO.
    useEffect(() => {
        if (userTheme?.mode) setPreference(parseThemePreference(userTheme.mode));
    }, [userTheme?.mode]);

    const theme = useMemo(() => buildTheme(preference, prefersDark), [preference, prefersDark]);
    logger.log("theme => ", theme.mode, theme.base);

    useEffect(() => {
        const root = document.documentElement;
        Object.entries(themeToVars(theme)).forEach(([name, value]) =>
            root.style.setProperty(name, value),
        );
        // A base entra como atributo para o CSS puro poder reagir (scrollbar,
        // seleção de texto) e como color-scheme para os controles nativos.
        root.dataset.theme = theme.base;
        root.style.colorScheme = theme.base;

        try {
            localStorage.setItem(THEME_STORAGE_KEY, theme.mode);
        } catch {
            /* storage unavailable (private mode / quota) — theme still applies in-session */
        }
    }, [theme]);

    const value = useMemo<ThemeContextType>(
        () => ({
            theme,
            preference,
            setPreference,
            setTheme: (next: ThemeType) => setPreference(parseThemePreference(next.mode)),
        }),
        [theme, preference],
    );

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );

}

export const useTheme = () => useContext(ThemeContext);
