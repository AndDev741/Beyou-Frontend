import { createContext, ReactNode, useContext, useEffect, useState } from "react"

const defaultLight = {
    mode: "light",
    background: "#ffffff",
    primary: "#0082e1",
    secondary: "#000000",
    description: "#616366ff",
    icon: "#4a4f55ff",
    placeholder: "#9ca3afff",
    success: "#16a34a",
    error: "#dc2626"
}

const defaultDark = {
    mode: "dark",
    background: "#18181B",
    primary: "#0082e1",
    secondary: "#e7e0e0ff",
    description: "#c2c4c7ff",
    icon: "#8cbceeff",
    placeholder: "#71717aff",
    success: "#22c55e",
    error: "#dc2626"
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
        root.style.setProperty("--icon", theme.icon);
        root.style.setProperty("--placeholder", theme.placeholder);
        root.style.setProperty("--success", theme.success);
        root.style.setProperty("--error", theme.error);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{theme, setTheme}}>
            {children}
        </ThemeContext.Provider>
    )

}

export const useTheme = () => useContext(ThemeContext);
