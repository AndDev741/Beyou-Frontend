import { createContext, ReactNode, useContext, useEffect, useState } from "react"
import {defaultDark, defaultLight} from "@beyou/theme";
import type { Theme } from "@beyou/theme";
import { useSelector } from "react-redux";
import { RootState } from "@beyou/state/rootReducer";
import { logger } from "../utils/logger";

export type ThemeType = Theme;
type ThemeContextType = {
    theme: ThemeType;
    setTheme: React.Dispatch<React.SetStateAction<ThemeType>>;
};

const ThemeContext = createContext<ThemeContextType>({
    theme: defaultLight,
    setTheme: () => { },
});

// A theme picked on the login page is saved here (NOT via redux-persist, where
// `perfil` is blacklisted as PII). It acts as the fallback below the logged-in
// account theme, so a choice made before signing up carries into the account
// when that account has no theme of its own.
const THEME_STORAGE_KEY = "beyou-theme";

function readStoredTheme(): ThemeType | null {
    try {
        const raw = localStorage.getItem(THEME_STORAGE_KEY);
        return raw ? (JSON.parse(raw) as ThemeType) : null;
    } catch {
        return null;
    }
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const userTheme = useSelector((state: RootState) => state.perfil.themeInUse);
    logger.log("USER THEME => ", userTheme);
    // Precedence: account theme → localStorage (pre-signup pick) → OS preference.
    const [theme, setTheme] = useState<ThemeType>(
        userTheme ?? readStoredTheme() ?? (prefersDark ? defaultDark : defaultLight)
    );
    logger.log("theme => ", theme);

    // The account theme wins once it is present. When it is absent (login page,
    // or a logged-in account with no saved theme) we keep whatever is already
    // applied — i.e. the localStorage pick — instead of resetting to OS default.
    useEffect(() => {
        if (userTheme) setTheme(userTheme);
    }, [userTheme]);

    useEffect(() => {
        const root = document.documentElement;

        root.style.setProperty("--background", theme.background);
        root.style.setProperty("--primary", theme.primary);
        root.style.setProperty("--secondary", theme.secondary);
        root.style.setProperty("--description", theme.description);
        root.style.setProperty("--icon", theme.icon);
        root.style.setProperty("--placeholder", theme.placeholder);
        root.style.setProperty("--success", theme.success);
        root.style.setProperty("--error", theme.error);

        try {
            localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
        } catch {
            /* storage unavailable (private mode / quota) — theme still applies in-session */
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    )

}

export const useTheme = () => useContext(ThemeContext);
