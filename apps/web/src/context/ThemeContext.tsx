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
    /** Raw preference (mode + pack), before resolving `system`. */
    preference: ThemePreference;
    setPreference: (next: ThemePreference) => void;
    /** @deprecated applies an already-resolved theme; prefer `setPreference`. */
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
        // Current format: the preference string ("system:beyou"). Older installs
        // stored the whole Theme object — we take its `mode`, which the parser
        // migrates from the legacy names ("Cyberpunk", "Late Latte", ...).
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
    // `system` follows the OS live: switching the system theme with the app open
    // shows up without a reload.
    const [prefersDark, setPrefersDark] = useState(() => prefersDarkQuery().matches);

    useEffect(() => {
        const query = prefersDarkQuery();
        const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
        query.addEventListener?.("change", onChange);
        return () => query.removeEventListener?.("change", onChange);
    }, []);

    // The account preference wins as soon as the profile loads. When there is
    // none, the local choice (made on the login screen) is kept instead of
    // resetting to the OS default.
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
        // The base goes in as an attribute so plain CSS can react (scrollbar,
        // text selection) and as color-scheme for the native controls.
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
