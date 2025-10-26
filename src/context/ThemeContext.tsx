import { createContext, ReactNode, useContext, useEffect, useState } from "react"
import {defaultDark, defaultLight} from "../components/utils/listOfThemes";

type ThemeType = typeof defaultLight;
type ThemeContextType = {
    theme: ThemeType;
    setTheme: React.Dispatch<React.SetStateAction<ThemeType>>;
};

const ThemeContext = createContext<ThemeContextType>({
    theme: defaultLight,
    setTheme: () => { },
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const [theme, setTheme] = useState(
        prefersDark ? defaultDark : defaultLight
    );
    console.log("Prefres dark? => ", prefersDark);

    useEffect(() => {
        const root = document.documentElement;

        if (theme.mode === "dark") root.classList.add("dark");
        else root.classList.remove("dark");

        root.style.setProperty("--background", theme.background);
        root.style.setProperty("--primary", theme.primary);
        root.style.setProperty("--secondary", theme.secondary);
        root.style.setProperty("--description", theme.description);
        root.style.setProperty("--icon", theme.icon);
        root.style.setProperty("--placeholder", theme.placeholder);
        root.style.setProperty("--success", theme.success);
        root.style.setProperty("--error", theme.error);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    )

}

export const useTheme = () => useContext(ThemeContext);
