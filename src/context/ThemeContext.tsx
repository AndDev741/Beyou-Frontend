import { createContext, ReactNode, useContext, useEffect, useState } from "react"

const defaultLight = {
    mode: "light",
    background: "#ffffff",
    primary: "#0082e1",
    secondary: "#000000",
    description: "#7f8b99ff"
}

const defaultDark = {
    mode: "light",
    background: "#18181B",
    primary: "#0082e1",
    secondary: "#ffffff",
    description: "#7f8b99ff"
}

type ThemeType = typeof defaultLight;
type ThemeContextType = {
    theme: ThemeType;
    setTheme: React.Dispatch<React.SetStateAction<ThemeType>>;
};

const ThemeContext = createContext<ThemeContextType>({
    theme: defaultLight,
    setTheme: () => {},
});

export const ThemeProvider = ({children}: {children: ReactNode}) => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const [theme, setTheme] = useState(
        prefersDark ? defaultDark : defaultLight
    );
    console.log("Prefres dark? => ", prefersDark);

    useEffect(() => {
        const root = document.documentElement;

        if(theme.mode === "dark") root.classList.add("dark");
        else root.classList.remove("dark");

        root.style.setProperty("--background", theme.background);
        root.style.setProperty("--primary", theme.primary);
        root.style.setProperty("--secondary", theme.secondary);
        root.style.setProperty("--description", theme.description);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{theme, setTheme}}>
            {children}
        </ThemeContext.Provider>
    )

}

export const useTheme = () => useContext(ThemeContext);


