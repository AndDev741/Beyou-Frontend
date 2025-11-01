import { createContext, ReactNode, useContext, useEffect, useState } from "react"
import {defaultDark, defaultLight} from "../components/utils/listOfThemes";
import { useSelector } from "react-redux";
import { RootState } from "../redux/rootReducer";

export type ThemeType = typeof defaultLight;
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
    const userTheme = useSelector((state: RootState) => state.perfil.themeInUse);
    console.log("USER THEME => ", userTheme);
    const [theme, setTheme] = useState(
        userTheme ? userTheme : prefersDark ? defaultDark : defaultLight
    );
    console.log("theme => ", theme);

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
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    )

}

export const useTheme = () => useContext(ThemeContext);
